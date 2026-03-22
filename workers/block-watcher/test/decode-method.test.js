const { Web3 } = require('web3');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('\n📦 Method Decoding Test\n');
console.log('Testing transaction: https://etherscan.io/tx/0x903b487c966c040bf6f240722c1b643ceb6851405ee1f217f6925b5eab279021');

(async () => {
  try {
    // Загружаем Oracle ABI
    const abiPath = path.join(__dirname, '../config/oracle-abi.json');
    console.log(`Loading ABI from: ${abiPath}`);
    const oracleABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    console.log(`Loaded ${oracleABI.length} ABI items`);
    
    // Создаем Web3 instance
    const web3 = new Web3();
    const oracleContract = new web3.eth.Contract(oracleABI, '0x1DF609afDC67396a9f307de2BA3E3b667dEe8b5B');
    
    // Raw transaction input data из https://etherscan.io/tx/0x903b487c966c040bf6f240722c1b643ceb6851405ee1f217f6925b5eab279021
    // Method ID должен быть 0x64eff0d1 для updateSeveralPrices
    const txInput = '0x64eff0d100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000007000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000090000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000b';
    
    // Декодируем имя метода
    let methodName = null;
    if (txInput && txInput.length >= 10) {
      const methodId = txInput.slice(0, 10);
      console.log(`\nMethod ID from input: ${methodId}`);
      
      // Перебираем все функции в ABI
      const functions = oracleABI.filter(item => item.type === 'function');
      console.log(`Checking ${functions.length} functions in ABI...`);
      
      const method = oracleABI.find(item => {
        if (item.type === 'function') {
          try {
            // Создаем сигнатуру функции: name(type1,type2,...)
            const signature = `${item.name}(${item.inputs.map(input => input.type).join(',')})`;
            const sig = web3.eth.abi.encodeFunctionSignature(signature);
            
            if (sig === methodId) {
              console.log(`✓ Found match: ${item.name} -> ${sig}`);
              return true;
            }
          } catch (e) {
            console.log(`✗ Failed to encode ${item.name}: ${e.message}`);
          }
        }
        return false;
      });
      
      if (method) {
        methodName = method.name;
      }
    }
    
    console.log(`\n📋 Decoded method name: ${methodName}`);
    
    // Проверка
    assert.strictEqual(methodName, 'updateSeveralPrices', 
      `Expected method name to be 'updateSeveralPrices' but got '${methodName}'`);
    
    console.log('\n✅ Test passed: Method correctly decoded as updateSeveralPrices\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
