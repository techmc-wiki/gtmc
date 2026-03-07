function adjustFontSize(action) {
    const markdownSection = document.querySelector('.markdown-section#main');
    let currentSize = parseFloat(window.getComputedStyle(markdownSection).fontSize);

    if (action === 'increase') {
        currentSize += 1;
    } else if (action === 'decrease') {
        currentSize -= 1;
    }

    markdownSection.style.setProperty('--font-size', `${currentSize}px`);
    updateFontSizeDisplay(currentSize);
    localStorage.setItem('font-size', currentSize);
}

function applyInitialStyles() {
    const savedSize = localStorage.getItem('font-size');
    if (savedSize) {
        const markdownSection = document.querySelector('.markdown-section#main');
        markdownSection.style.setProperty('--font-size', `${savedSize}px`);
    }
}

function updateFontSizeDisplay(fontSize) {
    const fontSizeDisplay = document.querySelector('.font-size-display');
    const lang = document.documentElement.lang;
    if (fontSizeDisplay) {
        if (lang === 'zh') {
            fontSizeDisplay.textContent = `当前字体大小: ${fontSize}px`;
        } else {
            fontSizeDisplay.textContent = `Font size: ${fontSize}px`;
        }
    }
}

document.addEventListener('DOMContentLoaded', applyInitialStyles);

var css = `
.markdown-section {
    --font-size: 15px;
    font-size: var(--font-size);
}

.markdown-section code {
    font-size: calc(var(--font-size) - 2px) !important;
}

.markdown-section ol, .markdown-section p, .markdown-section ul {
    line-height: calc(var(--font-size) * 2);
}

.markdown-section h1 {
    font-size: calc(var(--font-size) * 2.3);
}

.markdown-section h2 {
    font-size: calc(var(--font-size) * 2.1);
}

.markdown-section h3 {
    font-size: calc(var(--font-size) * 1.8);
}

.markdown-section h4 {
    font-size: calc(var(--font-size) * 1.5);
}

.markdown-section h5 {
    font-size: calc(var(--font-size) * 1.3);
}

.markdown-section h6 {
    font-size: calc(var(--font-size) * 1.1);
}

button.font-size-button {
    position: absolute;
    top: 15px;
    left: 55px;
    padding: 6px;
    background: transparent;
    cursor: pointer;
    z-index: 1000;
    font-size: 16px;
    border: none;
    border-radius: 5px;
}

button.font-size-button[onclick="adjustFontSize('decrease')"] {
    left: 100px;
}

.docsify-dark-mode button.font-size-button {
    color: var(--dark-base-color);
}

.font-size-display {
    position: absolute;
    top: 17px;
    left: 139px;
    background: transparent;
    font-size: 16px !important;
    z-index: 1000;
    color: #333;
}

@media (max-width: 768px) {
    .font-size-display {
        top: 40px;
        left:10px;
    }
}

.docsify-dark-mode .font-size-display{
    color: var(--dark-base-color);
}
`;

styleInject(css);

function install(hook, vm) {
    hook.afterEach(function (html) {
        const savedSize = localStorage.getItem('font-size') || 15;
        const lang = document.documentElement.lang;
        const fontSizeText = lang === 'zh' ? `当前字体大小: ${savedSize}px` : `Font size: ${savedSize}px`;
        var fontSizeButtons = `
            <button onclick="adjustFontSize('increase')" class="font-size-button" aria-label="Increase font size" title="Increase font size">A+</button>
            <button onclick="adjustFontSize('decrease')" class="font-size-button" aria-label="Decrease font size" title="Decrease font size">A-</button>
            <div class="font-size-display">${fontSizeText}</div>
        `;
        return fontSizeButtons + html;
    });
}

$docsify.plugins = [].concat(install, $docsify.plugins);
