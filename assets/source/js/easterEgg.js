function easterEggSwitcher() {
    var overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // 半透明背景
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.flexDirection = 'column';
    overlay.style.cursor = 'pointer';
    overlay.id = 'easter-egg-overlay';
    overlay.style.backdropFilter = 'blur(10px)';

    var img = document.createElement('img');
    img.src = '../source/img/egg.jpg';
    img.alt = 'Easter Egg';
    img.style.maxWidth = '80%';
    img.style.maxHeight = '80%';
    img.style.border = '2px solid #fff';
    img.style.boxShadow = '0px 0px 15px rgba(0, 0, 0, 0.5)';
    img.style.borderRadius = '8px';

    var text = document.createElement('p');
    text.textContent = '🚁🚁🚁尊贵的马桶塞子正在注视着你🚁🚁🚁';
    text.style.color = 'rgba(99, 246, 111, 0.78)';
    text.style.fontSize = '20px';
    text.style.fontWeight = 'bold';
    text.style.marginTop = '20px';

    overlay.appendChild(img);
    overlay.appendChild(text);

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function () {
        overlay.remove();
    });
}

function installEasterEgg(hook, vm) {
    hook.afterEach(function (html) {
        var easterEggButton = '<button onclick="easterEggSwitcher()" aria-label="Show Easter Egg"  class="easter-egg-toggle">🎉</button>';
        return easterEggButton + html;
    });
}

var easterEggCss = `
.easter-egg-toggle {
    position: absolute;
    left: 300px;
    top: 20px;
    opacity: 0.04;
    border: none;
    background: transparent;
    cursor: pointer;
    width: 20px;
    height: 20px;
    transition: opacity 0.3s ease;
}

.easter-egg-toggle:hover {
    opacity: 0.15;
}

@media (max-width: 768px) {
    .easter-egg-toggle {
        top: 20px;
        left:150px;
    }
}
`;

styleInject(easterEggCss);

$docsify.plugins = [].concat(installEasterEgg, $docsify.plugins);
