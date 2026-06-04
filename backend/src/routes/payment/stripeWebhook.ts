import { OrderStatus } from '@prisma/client';
import { Request, Response, Router } from 'express';

import { prisma } from '../../lib/prisma';
import { EmailService } from '../../services/EmailService';
import { markOrderPaid } from '../../services/OrderPaymentService';
import { PaymentService, StripeWebhookEvent } from '../../services/PaymentService';

const stripeWebhookRoutes = Router();
const paymentService = new PaymentService();
const emailService = new EmailService();

function getRawBody(req: Request) {
  return Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
}

function parseRawJsonBody(req: Request) {
  if (!Buffer.isBuffer(req.body)) {
    return req.body || {};
  }

  try {
    return JSON.parse(req.body.toString('utf8') || '{}');
  } catch {
    return {};
  }
}

function getStripeOrderId(event: StripeWebhookEvent) {
  const candidate =
    event.data.object.metadata?.order_id ||
    event.data.object.metadata?.orderId ||
    event.data.object.client_reference_id;
  const orderId = Number(candidate);

  return Number.isNaN(orderId) ? null : orderId;
}

function getStripePaymentIntentId(event: StripeWebhookEvent) {
  return String(event.data.object.payment_intent || event.data.object.id || '').trim();
}

function getNextStatus(event: StripeWebhookEvent) {
  const eventType = event.type;

  if (eventType === 'payment_intent.succeeded') {
    return OrderStatus.PAID;
  }

  if (
    eventType === 'checkout.session.async_payment_succeeded' ||
    (eventType === 'checkout.session.completed' && event.data.object.payment_status === 'paid')
  ) {
    return OrderStatus.PAID;
  }

  if (eventType === 'payment_intent.canceled') {
    return OrderStatus.CANCELED;
  }

  if (
    eventType === 'payment_intent.payment_failed' ||
    eventType === 'checkout.session.async_payment_failed'
  ) {
    return OrderStatus.PENDING;
  }

  return null;
}

function getMercadoPagoPaymentId(req: Request, body: any) {
  return String(
    body?.data?.id ||
      body?.id ||
      req.query['data.id'] ||
      req.query.id ||
      '',
  ).trim();
}

function mapMercadoPagoOrderStatus(status: string | undefined) {
  if (status === 'approved') {
    return OrderStatus.PAID;
  }

  if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(String(status))) {
    return OrderStatus.CANCELED;
  }

  return OrderStatus.PENDING;
}

stripeWebhookRoutes.post('/stripe', async (req: Request, res: Response) => {
  let event: StripeWebhookEvent;

  try {
    event = paymentService.constructStripeWebhookEvent(
      getRawBody(req),
      req.headers['stripe-signature'],
    );
  } catch (error) {
    console.error('[stripe-webhook] assinatura invalida:', error);
    return res.status(401).json({ error: 'Assinatura Stripe invalida.' });
  }

  const nextStatus = getNextStatus(event);

  if (!nextStatus) {
    return res.status(200).json({ received: true, ignored: true });
  }

  const orderId = getStripeOrderId(event);
  const paymentIntentId = getStripePaymentIntentId(event);

  if (!orderId && !paymentIntentId) {
    return res.status(400).json({ error: 'Pedido não identificado no webhook Stripe.' });
  }

  try {
    const order = orderId
      ? await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: true,
            customer: true,
          },
        })
      : await prisma.order.findFirst({
          where: {
            OR: [
              { gatewayOrderId: paymentIntentId },
              { gatewayChargeId: paymentIntentId },
            ],
          },
          include: {
            items: true,
            customer: true,
          },
        });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    if (['PAID', 'PAID_STOCK_ISSUE'].includes(String(order.status))) {
      return res.status(200).json({ received: true, alreadyProcessed: true });
    }

    if (nextStatus === OrderStatus.PAID) {
      const paidOrder = await markOrderPaid(order.id);
      if (paidOrder) {
        emailService.sendOrderConfirmation(paidOrder);
        emailService.sendPaymentConfirmedToAdmin(paidOrder);
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PENDING,
          paymentStatusDetail: event.type,
        },
      });
    } else {
      const canceledOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELED,
          paymentStatusDetail: event.type,
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
      emailService.sendPaymentFailed(canceledOrder, event.type);
    }
    console.log('[stripe-webhook] processado:', { orderId: order.id, event: event.type, nextStatus });
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[stripe-webhook] erro:', error);
    return res.status(500).json({ error: 'Processamento do webhook Stripe falhou.' });
  }
});

stripeWebhookRoutes.post('/mercado-pago', async (req: Request, res: Response) => {
  const body = parseRawJsonBody(req);
  const paymentId = getMercadoPagoPaymentId(req, body);
  const requestId = req.headers['x-request-id'];

  if (!paymentId) {
    return res.status(200).json({ received: true, ignored: true });
  }

  try {
    paymentService.verifyMercadoPagoWebhookSignature({
      signatureHeader: req.headers['x-signature'],
      requestId,
      dataId: paymentId,
    });
  } catch (error) {
    console.error('[mercado-pago-webhook] assinatura invalida:', {
      paymentId,
      requestId,
      message: error instanceof Error ? error.message : 'Assinatura invalida.',
    });
    return res.status(401).json({ error: 'Assinatura Mercado Pago invalida.' });
  }

  try {
    const payment = (await paymentService.getMercadoPagoPayment(paymentId)) as any;
    const paymentStatus = String(payment.status || '');
    const externalReference = String(payment.external_reference || '').trim();
    const orderId = Number(externalReference);
    const nextStatus = mapMercadoPagoOrderStatus(paymentStatus);

    console.log('[mercado-pago-webhook] pagamento consultado:', {
      paymentId,
      orderId: Number.isNaN(orderId) ? null : orderId,
      status: paymentStatus,
      requestId,
    });

    const order = !Number.isNaN(orderId)
      ? await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: true,
            customer: true,
          },
        })
      : await prisma.order.findFirst({
          where: {
            OR: [
              { gatewayOrderId: paymentId },
              { gatewayChargeId: paymentId },
            ],
          },
          include: {
            items: true,
            customer: true,
          },
        });

    if (!order) {
      console.warn('[mercado-pago-webhook] pedido nao encontrado:', {
        paymentId,
        externalReference,
      });
      return res.status(200).json({ received: true, orderNotFound: true });
    }

    if (['PAID', 'PAID_STOCK_ISSUE'].includes(String(order.status))) {
      return res.status(200).json({ received: true, alreadyProcessed: true });
    }

    if (nextStatus === OrderStatus.PAID) {
      const paidOrder = await markOrderPaid(order.id);
      if (paidOrder) {
        emailService.sendOrderConfirmation(paidOrder);
        emailService.sendPaymentConfirmedToAdmin(paidOrder);
      }
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          paymentStatusDetail: paymentStatus || 'mercado_pago_notification',
          paidAt: payment.date_approved ? new Date(payment.date_approved) : order.paidAt,
        },
      });
    }

    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'MERCADO_PAGO_WEBHOOK',
        message: `Webhook Mercado Pago recebido: ${paymentStatus || 'sem status'}.`,
        metadata: {
          paymentId,
          requestId: Array.isArray(requestId) ? requestId[0] : requestId,
          status: paymentStatus,
        },
      },
    }).catch(() => null);

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[mercado-pago-webhook] erro:', {
      paymentId,
      requestId,
      message: error instanceof Error ? error.message : 'Erro desconhecido.',
    });
    return res.status(500).json({ error: 'Processamento do webhook Mercado Pago falhou.' });
  }
});

export { stripeWebhookRoutes };
