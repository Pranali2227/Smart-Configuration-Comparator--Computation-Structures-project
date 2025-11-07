function toggleTheme() {
    const body = document.body;
    const toggleBtn = document.querySelector('.theme-toggle');
    body.classList.toggle('dark');
    toggleBtn.textContent = body.classList.contains('dark') ? '☀️ Light Mode' : '🌙 Dark Mode';
}

document.getElementById('uploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const compareBtn = document.getElementById('compareBtn');
    const resultsDiv = document.getElementById('results');
    const errorDiv = document.getElementById('error');
    const progressContainer = document.querySelector('.progress-container');
    const progressBar = document.getElementById('progressBar');

    compareBtn.disabled = true;
    compareBtn.textContent = 'Processing...';
    resultsDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 10;
        if (progress <= 90) {
            progressBar.style.width = progress + '%';
        }
    }, 200);

    fetch('/compare', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        setTimeout(() => {
            progressContainer.style.display = 'none';
            if (data.error) {
                errorDiv.textContent = data.error;
                errorDiv.style.display = 'block';
            } else {
                const file1ContentDiv = document.getElementById('file1_content');
                const file2ContentDiv = document.getElementById('file2_content');
                file1ContentDiv.innerHTML = '';
                file2ContentDiv.innerHTML = '';
                if (data.file1_url) {
                    const img1 = document.createElement('img');
                    img1.src = data.file1_url;
                    img1.style.width = '100%';
                    img1.style.height = 'auto';
                    file1ContentDiv.appendChild(img1);
                }
                const pre1 = document.createElement('pre');
                pre1.textContent = data.file1_content;
                file1ContentDiv.appendChild(pre1);
                if (data.file2_url) {
                    const img2 = document.createElement('img');
                    img2.src = data.file2_url;
                    img2.style.width = '100%';
                    img2.style.height = 'auto';
                    file2ContentDiv.appendChild(img2);
                }
                const pre2 = document.createElement('pre');
                pre2.textContent = data.file2_content;
                file2ContentDiv.appendChild(pre2);
                document.getElementById('similarities').innerHTML = '<pre>' + data.similarities + '</pre>';
                document.getElementById('file1_diff').innerHTML = '<pre>' + data.file1_diff + '</pre>';
                document.getElementById('file2_diff').innerHTML = '<pre>' + data.file2_diff + '</pre>';
                resultsDiv.style.display = 'block';
                document.getElementById('compareAgainBtn').style.display = 'block';
                setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 100);
            }
        }, 500);
    })
    .catch(error => {
        clearInterval(progressInterval);
        progressContainer.style.display = 'none';
        errorDiv.textContent = 'An error occurred: ' + error.message;
        errorDiv.style.display = 'block';
    })
    .finally(() => {
        compareBtn.disabled = false;
        compareBtn.textContent = 'Generate Comparison';
    });
});

document.getElementById('compareAgainBtn').addEventListener('click', function() {
    document.getElementById('results').style.display = 'none';
    document.getElementById('compareAgainBtn').style.display = 'none';
    document.getElementById('uploadForm').reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
