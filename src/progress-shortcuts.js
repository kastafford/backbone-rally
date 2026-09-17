// Match the course's cyan launch rings and lavender landing rings.
export function renderShortcutProgress(container, routes) {
  container.replaceChildren();
  container.classList.toggle('hidden', routes.length === 0);
  routes.forEach((route, index) => {
    const marker = document.createElement('span');
    marker.className = 'progress-shortcut';
    marker.style.left = `${route.from * 100}%`;
    marker.style.width = `${(route.to - route.from) * 100}%`;
    marker.style.setProperty('--lane', `${8 + index * 11}px`);
    marker.setAttribute('role', 'img');
    marker.title = `Shortcut ${index + 1}: ${route.name} · ${route.detail}`;
    marker.setAttribute('aria-label', marker.title);
    const label = document.createElement('span');
    label.className = 'progress-shortcut-label';
    label.textContent = `↗${index + 1}`;
    marker.append(label);
    container.append(marker);
  });
}
