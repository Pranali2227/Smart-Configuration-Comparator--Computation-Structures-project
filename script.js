function toggleTheme() {
    const body = document.body;
    const toggleBtn = document.querySelector('.theme-toggle');
    body.classList.toggle('dark');
    toggleBtn.textContent = body.classList.contains('dark') ? '☀️ Light Mode' : '🌙 Dark Mode';
}

async function extractTextFromFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    let text = '';

    try {
        if (ext === 'txt' || ext === 'html' || ext === 'rtf') {
            text = await file.text();
        } else if (ext === 'pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
            for (let i = 1; i <= pdf.numPages; i++) { // Extract all pages
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                text += textContent.items.map(item => item.str).join(' ') + '\n';
            }
        } else if (ext === 'docx') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({arrayBuffer: arrayBuffer});
            text = result.value;
        } else if (ext === 'xlsx' || ext === 'xls') {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, {type: 'array'});
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                text += csv + '\n';
            });
        } else if (ext === 'pptx') {
            text = "PPTX text extraction not fully supported in browser. Please use server-side processing.";
        } else if (['png', 'jpg', 'jpeg', 'bmp', 'tiff'].includes(ext)) {
            try {
                // Load image
                const img = new Image();
                img.src = URL.createObjectURL(file);
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });

                // Resize image for faster OCR if too large
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxWidth = 800; // Balanced for speed and accuracy
                const scale = Math.min(1, maxWidth / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Convert to blob
                const resizedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));

                // Perform OCR with optimized settings
                const result = await Tesseract.recognize(resizedBlob, 'eng', {
                    logger: m => console.log(m),
                    tessedit_pageseg_mode: Tesseract.PSM_AUTO_OSD, // Auto OSD for better detection
                    tessedit_ocr_engine_mode: Tesseract.OEM_LSTM_ONLY // LSTM for better accuracy
                });
                text = result.data.text;
            } catch (ocrError) {
                text = `OCR failed: ${ocrError.message}`;
            }
        }
    } catch (error) {
        text = `Error extracting text: ${error.message}`;
    }

    return text.trim();
}

function compareTexts(text1, text2) {
    // Normalize text: convert to lowercase for case-insensitive comparison
    const normalize = (text) => text.toLowerCase().trim().replace(/\s+/g, ' ');
    const normText1 = normalize(text1);
    const normText2 = normalize(text2);

    // Split into words
    const words1 = normText1.split(/\s+/);
    const words2 = normText2.split(/\s+/);

    // Find similarities (common words)
    const common = words1.filter(word => words2.includes(word));
    const similarities = [...new Set(common)].join(' ');

    // Find differences
    const diff1 = words1.filter(word => !words2.includes(word));
    const diff2 = words2.filter(word => !words1.includes(word));

    const file1Diff = diff1.map(word => `- ${word}`).join('\n');
    const file2Diff = diff2.map(word => `+ ${word}`).join('\n');

    return {
        similarities: similarities,
        file1Diff: file1Diff,
        file2Diff: file2Diff,
        originalText1: text1,
        originalText2: text2
    };
}

document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const file1 = document.getElementById('file1').files[0];
    const file2 = document.getElementById('file2').files[0];
    const compareBtn = document.getElementById('compareBtn');
    const resultsDiv = document.getElementById('results');
    const errorDiv = document.getElementById('error');
    const progressContainer = document.querySelector('.progress-container');
    const progressBar = document.getElementById('progressBar');

    if (!file1 || !file2) {
        errorDiv.textContent = 'Please select both files.';
        errorDiv.style.display = 'block';
        return;
    }

    compareBtn.disabled = true;
    compareBtn.textContent = 'Processing...';
    resultsDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    try {
        // Extract text from files
        progressBar.style.width = '25%';
        const text1 = await extractTextFromFile(file1);
        progressBar.style.width = '50%';
        const text2 = await extractTextFromFile(file2);
        progressBar.style.width = '75%';

        // Compare texts
        const comparison = compareTexts(text1, text2);
        progressBar.style.width = '100%';

        setTimeout(() => {
            progressContainer.style.display = 'none';

            // Display results
            const file1ContentDiv = document.getElementById('file1_content');
            const file2ContentDiv = document.getElementById('file2_content');
            file1ContentDiv.innerHTML = '';
            file2ContentDiv.innerHTML = '';

            if (['png', 'jpg', 'jpeg', 'bmp', 'tiff'].includes(file1.name.split('.').pop().toLowerCase())) {
                const img1 = document.createElement('img');
                img1.src = URL.createObjectURL(file1);
                img1.style.maxWidth = '300px';
                img1.style.height = 'auto';
                file1ContentDiv.appendChild(img1);
            }
            const pre1 = document.createElement('pre');
            pre1.textContent = text1;
            file1ContentDiv.appendChild(pre1);

            if (['png', 'jpg', 'jpeg', 'bmp', 'tiff'].includes(file2.name.split('.').pop().toLowerCase())) {
                const img2 = document.createElement('img');
                img2.src = URL.createObjectURL(file2);
                img2.style.maxWidth = '300px';
                img2.style.height = 'auto';
                file2ContentDiv.appendChild(img2);
            }
            const pre2 = document.createElement('pre');
            pre2.textContent = text2;
            file2ContentDiv.appendChild(pre2);

            document.getElementById('similarities').innerHTML = '<pre>' + comparison.similarities + '</pre>';
            document.getElementById('file1_diff').innerHTML = '<pre>' + comparison.file1Diff + '</pre>';
            document.getElementById('file2_diff').innerHTML = '<pre>' + comparison.file2Diff + '</pre>';

            resultsDiv.style.display = 'block';
            document.getElementById('compareAgainBtn').style.display = 'block';
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        }, 500);

    } catch (error) {
        progressContainer.style.display = 'none';
        errorDiv.textContent = 'An error occurred: ' + error.message;
        errorDiv.style.display = 'block';
    } finally {
        compareBtn.disabled = false;
        compareBtn.textContent = 'Generate Comparison';
    }
});

document.getElementById('compareAgainBtn').addEventListener('click', function() {
    document.getElementById('results').style.display = 'none';
    document.getElementById('compareAgainBtn').style.display = 'none';
    document.getElementById('uploadForm').reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
