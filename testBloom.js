// testDynamicBloomFilter.js

// Import your DynamicBloomFilter class.
// Adjust the require path as needed if your file name is different.
const { DynamicBloomFilter } = require('./bloom');

// Function to test a dynamic Bloom filter with a given number of records.
function testDynamicBloomFilter(numRecords) {
  console.log(`\n========== Testing with ${numRecords} records ==========`);

  // Create a dynamic Bloom filter.
  // Parameters: initialSize, falsePositiveRate, maxElementsPerFilter.
  // Here we use initialSize=100 bits, falsePositiveRate=0.01 and maxElementsPerFilter=100.
  const dbf = new DynamicBloomFilter(100, 0.01, 100);
  const insertedElements = [];
  
  console.time(`Insertion of ${numRecords} records`);
  // Insert records: here we simply use string keys "record-0", "record-1", ..., etc.
  for (let i = 0; i < numRecords; i++) {
    const element = `record-${i}`;
    dbf.add(element);
    insertedElements.push(element);
  }
  console.timeEnd(`Insertion of ${numRecords} records`);

  // Report how many static filters have been created.
  console.log(`Number of static filters used: ${dbf.filters.length}`);

  // Check membership for all inserted elements.
  let falseNegatives = 0;
  for (const element of insertedElements) {
    if (!dbf.check(element)) {
      falseNegatives++;
    }
  }
  console.log(`False negatives (should be 0): ${falseNegatives}`);

  // Check the false positive rate:
  // We'll test 1000 elements that were not inserted.
  let falsePositives = 0;
  let totalTested = 0;
  for (let i = numRecords; i < numRecords + 1000; i++) {
    const element = `record-${i}`;
    totalTested++;
    if (dbf.check(element)) {
      falsePositives++;
    }
  }
  const falsePositiveRate = (falsePositives / totalTested) * 100;
  console.log(`False positive rate over ${totalTested} non-inserted records: ${falsePositiveRate.toFixed(2)}%`);
}

// Run tests:

// Test with 1,000 records
testDynamicBloomFilter(1000);

// Uncomment the following line to test with 1 million records.
// Be aware that this might take more time and use more memory.
// testDynamicBloomFilter(1000000);
