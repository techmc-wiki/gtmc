function createDownloadButton(text, path) {
    const encodedPath = path
        .trim()
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');

    return `
    <button class="download-button" onclick="showDownloadModal('${encodedPath}')">
      ${text.trim()}
      <svg class="download-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
    </button>
  `;
}

function showDownloadModal(encodedPath) {
    const mirrors = [
        { name: 'Github Raw 国内访问速度可能较慢', baseUrl: 'https://github.com/tanhHeng/GraduateTextsInTechnicalMC/raw/main/' },
        { name: '镜像站1 github.tbedu.top', baseUrl: 'https://github.tbedu.top/https://github.com/tanhHeng/GraduateTextsInTechnicalMC/raw/main/' },
        { name: '镜像站2 gh.llkk.cc', baseUrl: 'https://gh.llkk.cc/https://github.com/tanhHeng/GraduateTextsInTechnicalMC/raw/main/' },
        { name: '镜像站3 gh-proxy.com', baseUrl: 'https://gh-proxy.com/https://github.com/tanhHeng/GraduateTextsInTechnicalMC/raw/main/' },
        { name: '镜像站4 github.7boe.top', baseUrl: 'https://github.7boe.top/https://github.com/tanhHeng/GraduateTextsInTechnicalMC/raw/main/' },
        { name: '镜像站5 fastgit.cc', baseUrl: 'https://fastgit.cc/https://github.com/tanhHeng/GraduateTextsInTechnicalMC/raw/main/' }
    ];

    const modalContent = mirrors.map(mirror => {
        const downloadUrl = mirror.baseUrl + encodedPath;
        return `
            <a href="${downloadUrl}" class="download-button" download>
                ${mirror.name}
                <svg class="download-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
            </a>
        `;
    }).join('');

    const modalHtml = `
        <div class="download-modal-overlay" onclick="closeDownloadModal()"></div>
        <div class="download-modal">
        <a>请选择下载源</a>
            ${modalContent}
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeDownloadModal() {
    const modalOverlay = document.querySelector('.download-modal-overlay');
    const modal = document.querySelector('.download-modal');
    if (modalOverlay && modal) {
        modalOverlay.remove();
        modal.remove();
    }
}

var css = `
.download-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(248, 248, 248, 0.9);
    backdrop-filter: blur(8px);
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.28);
    z-index: 1001;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 500px;
    max-width: 90%;
    max-height: 90%;
}

.download-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.64);
    backdrop-filter: blur(5px);
    z-index: 1000;
}

.download-button {
    display: inline-flex;
    justify-content: space-between;
    align-items: center;
    padding: 3px 3px;
    font-size: calc(var(--font-size) + 1px);
    color: rgba(66, 185, 131, 0.9) !important;
    background-color: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(69, 160, 73, 0.04);
    border-radius: 8px;
    transition: background-color 0.3s, border-color 0.3s, transform 0.2s;
    margin: 2px 5px;
    cursor: pointer;
    box-shadow: 0 0 5px 2px rgba(0, 0, 0, 0.08);
    text-decoration: none;
}

.download-button:hover {
    background-color: rgba(0, 0, 0, 0.06);
    border-color: rgba(4, 4, 4, 0.18);
    transform: scale(1.08);
}

.download-button:active {
    background-color: rgba(255, 255, 255, 0.95);
    border-color: #388E3C;
    transform: scale(0.9);
}

.download-button:focus {
    outline: none;
    box-shadow: 0 0 5px 2px rgba(72, 163, 81, 0.1);
}

.download-icon {
  width: calc(var(--font-size) + 7px);
  height: calc(var(--font-size) + 7px);
}

div.download-modal svg{
    width: 45px;
    height: 45px;
}

div.download-modal {
    font-size: 25px;
}

@media (max-width: 768px) {
div.download-modal svg{
    width: 25px;
    height: 25px;
}

div.download-modal {
    font-size: 15px;
}
}

`;
styleInject(css);

function install(hook, vm) {
    hook.afterEach(function (html) {
        const modifiedHtml = html.replace(
            /\[\[([^|\]]+)\|([^\]]+)\]\]/g,
            (match, text, path) => createDownloadButton(text, path)
        );
        return modifiedHtml;
    });
}

window.$docsify = window.$docsify || {};
window.$docsify.plugins = [].concat(install, window.$docsify.plugins || []);