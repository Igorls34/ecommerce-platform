const path = require('path');

const testFiles = ['./auth.test.js', './products.test.js', './orders.test.js'];

async function main() {
  const tests = testFiles.flatMap((file) => require(path.join(__dirname, file)));
  let passed = 0;

  for (const testCase of tests) {
    try {
      await testCase.run();
      passed += 1;
      console.log(`PASS ${testCase.name}`);
    } catch (error) {
      console.error(`FAIL ${testCase.name}`);
      console.error(error);
      process.exitCode = 1;
    }
  }

  console.log(`\n${passed}/${tests.length} testes passaram.`);

  if (process.exitCode) {
    process.exit(process.exitCode);
  }
}

main().catch((error) => {
  console.error('Erro ao executar a suite de testes.');
  console.error(error);
  process.exit(1);
});
