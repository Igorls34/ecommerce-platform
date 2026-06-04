import { Request, Response } from 'express';

import { FiscalService } from '../services/FiscalService';

const fiscalService = new FiscalService();

function getOrderId(req: Request) {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    throw new Error('ID do pedido inválido.');
  }

  return id;
}

function getDocumentId(req: Request) {
  const id = Number(req.params.documentId);

  if (Number.isNaN(id)) {
    return undefined;
  }

  return id;
}

function handleFiscalError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : 'Erro ao processar documento fiscal.';
  const status = /não encontrado/i.test(message)
    ? 404
    : /inválido|pendente|bloqueada|configurad|pagamento/i.test(message)
      ? 400
      : 500;

  return res.status(status).json({ error: message });
}

export const getFiscalIntegrationStatus = async (_req: Request, res: Response) => {
  try {
    return res.status(200).json(fiscalService.getStatus());
  } catch (error) {
    console.error(error);
    return handleFiscalError(res, error);
  }
};

export const getOrderFiscalDocuments = async (req: Request, res: Response) => {
  try {
    const orderId = getOrderId(req);
    const documents = await fiscalService.getOrderDocuments(orderId);

    return res.status(200).json(documents);
  } catch (error) {
    console.error(error);
    return handleFiscalError(res, error);
  }
};

export const prepareOrderFiscalDocument = async (req: Request, res: Response) => {
  try {
    const orderId = getOrderId(req);
    const document = await fiscalService.prepareOrderDocument(orderId);

    return res.status(201).json(document);
  } catch (error) {
    console.error(error);
    return handleFiscalError(res, error);
  }
};

export const issueOrderFiscalDocument = async (req: Request, res: Response) => {
  try {
    const orderId = getOrderId(req);
    const document = await fiscalService.issueOrderDocument(orderId);

    return res.status(200).json(document);
  } catch (error) {
    console.error(error);
    return handleFiscalError(res, error);
  }
};

export const syncOrderFiscalDocument = async (req: Request, res: Response) => {
  try {
    const orderId = getOrderId(req);
    const documentId = getDocumentId(req);
    const document = await fiscalService.syncOrderDocument(orderId, documentId);

    return res.status(200).json(document);
  } catch (error) {
    console.error(error);
    return handleFiscalError(res, error);
  }
};
