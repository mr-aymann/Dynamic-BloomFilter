class StaticBloomFilter {
    constructor(size, hashFunctionCount) {
      this.size = size;
      this.bitArray = new Uint8Array((size >> 3) + 1);
      this.hashFunctionCount = hashFunctionCount;
      this.elementCount = 0;
    }
  
    add(element) {
      const hashValues = this.getHashValues(element);
      hashValues.forEach(index => {
        this.bitArray[index >> 3] |= (1 << (index & 7));
      });
      this.elementCount++;
    }
  
    check(element) {
      const hashValues = this.getHashValues(element);
      return hashValues.every(index => (this.bitArray[index >> 3] & (1 << (index & 7))) !== 0);
    }
  
    getHashValues(element) {
      const stringValue = String(element);
      const hashValues = [];
  
      let h1 = 5381;
      for (let i = 0; i < stringValue.length; i++) {
        h1 = ((h1 << 5) + h1) + stringValue.charCodeAt(i);
      }
      hashValues.push(Math.abs(h1) % this.size);
  
      let h2 = 2166136261;
      for (let i = 0; i < stringValue.length; i++) {
        h2 ^= stringValue.charCodeAt(i);
        h2 += (h2 << 1) + (h2 << 4) + (h2 << 7) + (h2 << 8) + (h2 << 24);
      }
      hashValues.push(Math.abs(h2) % this.size);
  
      for (let i = 2; i < this.hashFunctionCount; i++) {
        const combinedHash = (hashValues[0] + i * hashValues[1]) % this.size;
        hashValues.push(combinedHash);
      }
  
      return hashValues;
    }
  
    // Calculate the false positive rate
    getFalsePositiveRate() {
      const k = this.hashFunctionCount;
      const m = this.size;
      const n = this.elementCount;
      // Probability that a bit is still 0 after inserting n elements
      const p = Math.pow(1 - Math.exp(-k * n / m), k);
      return p;
    }
  
    // Calculate the fill ratio
    getFillRatio() {
      let setBits = 0;
      for (let i = 0; i < this.bitArray.length; i++) {
        let byte = this.bitArray[i];
        while (byte) {
          setBits += byte & 1;
          byte >>= 1;
        }
      }
      return setBits / this.size;
    }
  }
  
  
  class DynamicBloomFilter {
    constructor(initialElements, falsePositiveRate = 0.01) {
      this.falsePositiveRate = falsePositiveRate;
      this.initialSize = this.calculateOptimalSize(initialElements, falsePositiveRate);
      this.loadFactor=initialElements/this.initialSize;
      this.filters = [new StaticBloomFilter(this.initialSize, this.getOptimalHashCount(this.initialSize, initialElements))];
    }
  
    calculateOptimalSize(n, p) {
      return Math.ceil(-(n * Math.log(p)) / (Math.log(2) * Math.log(2)));
    }
  
    getOptimalHashCount(m, n) {
      return Math.max(1, Math.round((m / n) * Math.log(2)));
    }
  
    add(element) {
      const currentFilter = this.filters[this.filters.length - 1];
      if (currentFilter.elementCount >= this.initialSize * this.loadFactor) {
        const newFilter = new StaticBloomFilter(this.initialSize, this.getOptimalHashCount(this.initialSize, this.initialSize * this.loadFactor));
        this.filters.push(newFilter);
      }
      this.filters[this.filters.length - 1].add(element);
    }
  
    check(element) {
      return this.filters.some(filter => filter.check(element));
    }
  }

  // Function to load and parse the local CSV file
function loadEmailsFromCSV() {
    
    fetch('emails.csv')
      .then(response => response.text())
      .then(data => {
        // Split the CSV data into lines and filter out empty lines
        const lines = data.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return;
        
        // Split the header and find indices for FROM and TO columns
        const headers = lines[0].split(',').map(h => h.trim());
        const fromIndex = headers.indexOf('FROM');
        const toIndex = headers.indexOf('TO');
  
        // Array to collect email addresses
        let emails = [];
        
        // Process each line (skip header)
        for (let i = 1; i < lines.length; i++) {
          // For a robust solution, you might use a CSV parsing library.
          // For simplicity, we assume that commas do not appear in the email fields.
          const row = lines[i].split(',').map(item => item.trim());
          if (row.length > Math.max(fromIndex, toIndex)) {
            // Remove surrounding quotes if any
            const fromEmail = row[fromIndex].replace(/^"+|"+$/g, '');
            const toEmail = row[toIndex].replace(/^"+|"+$/g, '');
            if (fromEmail) emails.push(fromEmail);
            if (toEmail) emails.push(toEmail);
          }
        }
        
        // Remove duplicates
        emails = [...new Set(emails)];
        
        // Populate the dropdown with email options
        const dropdown = document.getElementById('emailDropdown');
        dropdown.innerHTML = '<option value="">-- Select an Email --</option>'; // Reset options
        emails.forEach(email => {
          const option = document.createElement('option');
          option.value = email;
          option.textContent = email;
          dropdown.appendChild(option);
        });
      })
      .catch(error => {
        console.error('Error loading CSV:', error);
      });
  }
  
  function loadEmailsFromCSVAndAddToBloomFilter(filter) {
    fetch('emails.csv')
      .then(response => response.text())
      .then(data => {
        const lines = data.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return;
  
        const headers = lines[0].split(',').map(h => h.trim());
        const fromIndex = headers.indexOf('FROM');
        const toIndex = headers.indexOf('TO');
        let emails = [];
  
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(item => item.trim());
          if (row.length > Math.max(fromIndex, toIndex)) {
            const fromEmail = row[fromIndex].replace(/^"+|"+$/g, '');
            const toEmail = row[toIndex].replace(/^"+|"+$/g, '');
            if (fromEmail) emails.push(fromEmail);
            if (toEmail) emails.push(toEmail);
          }
        }
        // Remove duplicates
        emails = [...new Set(emails)];
  
        // Populate the dropdown with email options
        const dropdown = document.getElementById('emailDropdown');
        dropdown.innerHTML = '<option value="">-- Select an Email --</option>';
        emails.forEach(email => {
          const option = document.createElement('option');
          option.value = email;
          option.textContent = email;
          dropdown.appendChild(option);
        });
  
        // Automatically add each email to the Bloom filter
        emails.forEach(email => {
          filter.add(email);
        });
      })
      .catch(error => {
        console.error('Error loading CSV:', error);
      });
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    // Create a DynamicBloomFilter instance for emails.
   
    const emailBloomFilter = new DynamicBloomFilter(1000,0.01);
  
    // Load emails from CSV and automatically add them to the Bloom filter.
    loadEmailsFromCSVAndAddToBloomFilter(emailBloomFilter);

    
  
    // Sync dropdown selection with the email input field.
    document.getElementById('emailDropdown').addEventListener('change', function (e) {
      const selectedEmail = e.target.value;
      console.log(selectedEmail);
      document.getElementById('emailInput').value = selectedEmail;
    });
  
    // Event listener for manually adding an email.
    document.getElementById('addEmailBtn').addEventListener('click', function () {
      const email = document.getElementById('emailInput').value.trim();
      if (email === '') {
        alert("Please enter a valid email.");
        return;
      }
      emailBloomFilter.add(email);
      const resultDiv = document.getElementById('emailResult');
      resultDiv.textContent = `Email "${email}" has been added to the filter.`;
      resultDiv.classList.remove('hidden');
      updateEmailStats(emailBloomFilter);
    });
  
    // Event listener for checking an email.
    document.getElementById('checkEmailBtn').addEventListener('click', function () {
      const email = document.getElementById('emailInput').value.trim();
      if (email === '') {
        alert("Please enter a valid email.");
        return;
      }
      const exists = emailBloomFilter.check(email);
      console.log(exists);
      const resultDiv = document.getElementById('emailResult');
      if (exists) {
        resultDiv.textContent = `Email "${email}" might exist in the filter (note: might be possible false positive a chance of 1 per 10,000 elements checked(0.01%))`;
      } else {
        resultDiv.textContent = `Email "${email}" definitely does NOT exist in the filter.`;
      }
      resultDiv.classList.remove('hidden');
    });
  
    // Function to update live statistics for the email bloom filter.
    function updateEmailStats(filter) {
      const statsDiv = document.getElementById('filterStats');
      // Update Email Filter Size (assumes it's the first stat element)
      statsDiv.children[0].children[1].textContent = filter.filters[0].size;
      // Update Email Fill Ratio (third stat element)
      statsDiv.children[2].children[1].textContent = (filter.filters[0].getFillRatio() * 100).toFixed(2) + '%';
      // Update Email False Positive Rate (fifth stat element)
      statsDiv.children[4].children[1].textContent = filter.filters[0].getFalsePositiveRate().toFixed(4);
    }
  });

   // Global variables
   let dynamicFilter = null;
   const insertedElements = [];
   
   // UI Update Functions
   
   // Show configuration details
   function updateConfigDetails(expected, p, filter) {
    console.log(filter)
     const configDiv = document.getElementById("configDetails");
     configDiv.innerHTML = `
       <p><strong>Expected Elements (n):</strong> ${expected}</p>
       <p><strong>Desired False Positive Rate (p):</strong> ${p}</p>
       <p><strong>Calculated Filter Size (m):</strong> ${filter.initialSize} bits</p>
       <p><strong>Number of Hash Functions (k):</strong> ${filter.filters[0].hashFunctionCount}</p>
       <p><strong>Load Factor Threshold:</strong> ${(
         filter.loadFactor * 100
       ).toFixed(2)}%</p>
       <p>
         <em>Formula for m:</em> m = ceil(- (n * ln(p)) / (ln2)^2)
       </p>
       <p>
         <em>Formula for k:</em> k = round((m/n) * ln2)
       </p>
     `;
   }
   
   // Update the inserted elements list
   function updateInsertedElementsList() {
     const list = document.getElementById("insertedValuesList");
     list.innerHTML = "";
     insertedElements.forEach((el, idx) => {
       const li = document.createElement("li");
       li.textContent = `${idx + 1}. ${el}`;
       list.appendChild(li);
     });
   }
   
   // Render the bit matrix for all static filters as a table.
   function renderBitMatrix() {
     const tbody = document.querySelector("#bitMatrixTable tbody");
     tbody.innerHTML = "";
     dynamicFilter.filters.forEach((filter, filterIndex) => {
       // Create a row for this static filter.
       const tr = document.createElement("tr");
       // First column: filter number.
       const tdIndex = document.createElement("td");
       tdIndex.classList.add("border-b", "px-2", "py-1");
       tdIndex.textContent = filterIndex + 1;
       tr.appendChild(tdIndex);
       // Second column: bit array visualization.
       const tdBits = document.createElement("td");
       tdBits.classList.add("border-b", "px-2", "py-1");
       // Create a container for bits (each filter is displayed as a row of cells)
       const bitContainer = document.createElement("div");
       bitContainer.classList.add("flex", "flex-wrap", "gap-1");
       for (let i = 0; i < filter.size; i++) {
         const byteIndex = i >> 3;
         const bitIndex = i & 7;
         const isSet = (filter.bitArray[byteIndex] & (1 << bitIndex)) !== 0;
         const bitCell = document.createElement("div");
         bitCell.classList.add("bit-cell");
         // Set color based on whether the bit is set.
         bitCell.classList.add(isSet ? "bg-blue-500" : "bg-gray-600");
         bitCell.title = `Bit ${i}: ${isSet ? "1" : "0"}`;
         bitContainer.appendChild(bitCell);
       }
       tdBits.appendChild(bitContainer);
       tr.appendChild(tdBits);
       tbody.appendChild(tr);
     });
   }
   
   // Show details for the processed element (hash positions)
   function showElementDetails(element) {
     const detailsDiv = document.getElementById("elementDetails");
     // For demonstration, use the last (current) filter
     const currentFilter =
       dynamicFilter.filters[dynamicFilter.filters.length - 1];
     const hashValues = currentFilter.getHashValues(element);
     detailsDiv.innerHTML = `
       <p><strong>Element:</strong> "${element}"</p>
       <p><strong>Hash Positions:</strong> [${hashValues.join(", ")}]</p>
     `;
   }
   
   // Hook up buttons after DOM load
   document.addEventListener("DOMContentLoaded", () => {
     // Initialize filter when user clicks "Initialize Filter"
     document.getElementById("initFilterBtn").addEventListener("click", () => {
       const expected = parseInt(document.getElementById("expectedElements").value);
       const p = parseFloat(document.getElementById("falsePositiveRatio").value);
       if (!expected || !p) {
         alert("Please enter valid numbers for both expected elements and false positive ratio.");
         return;
       }
       dynamicFilter = new DynamicBloomFilter(expected, p);
       updateConfigDetails(expected, p, dynamicFilter);
       renderBitMatrix();
     });
   
     // Add element button
     document.getElementById("addElementBtn").addEventListener("click", () => {
       if (!dynamicFilter) {
         alert("Please initialize the filter first.");
         return;
       }
       const element = document.getElementById("elementInput").value.trim();
       if (!element) {
         alert("Please enter a valid element.");
         return;
       }
       // Show how the element is divided into hash positions
       showElementDetails(element);
       // Insert element into the dynamic filter
       dynamicFilter.add(element);
       // Add to inserted elements list
       insertedElements.push(element);
       updateInsertedElementsList();
       // Re-render the bit matrix visualization
       renderBitMatrix();
       document.getElementById("elementInput").value = "";
     });
   
     // Check element button
     document.getElementById("checkElementBtn").addEventListener("click", () => {
       if (!dynamicFilter) {
         alert("Please initialize the filter first.");
         return;
       }
       const element = document.getElementById("elementInput").value.trim();
       if (!element) {
         alert("Please enter a valid element.");
         return;
       }
       const exists = dynamicFilter.check(element);
       showElementDetails(element);
       alert(
         `"${element}" ${exists ? "might exist (possible false positive)" : "definitely does NOT exist"} in the filter.`
       );
     });
   });
  
  