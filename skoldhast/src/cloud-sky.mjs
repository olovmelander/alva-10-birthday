/* Alva's cloud is a distant sky companion, not a foreground world prop.
 * Work in screen coordinates so real world heights/portrait cameras cannot
 * send it underground or enlarge a little paper drawing over the sun.
 */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = v => { const k = clamp(v, 0, 1); return k * k * (3 - 2 * k); };

export function cloudSkyLayout({ width: W, height: H, textureWidth, textureHeight,
    cameraX = 0, originX = 0, time = 0, lessMotion = false, picture = false, sun = null }) {
    const portrait = H > W * 1.05;
    const shortLandscape = !portrait && H < 500;
    const margin = Math.min(W, H) * .035;
    const scale = Math.min(Math.min(W * (portrait ? .34 : shortLandscape ? .18 : .24), 280) / Math.max(1, textureWidth),
        Math.min(H * (portrait ? .10 : .18), portrait ? 76 : 114) / Math.max(1, textureHeight));
    const width = textureWidth * scale, height = textureHeight * scale;
    const drift = lessMotion ? 0 : Math.sin(time * .055) * W * .016;
    // Bounded parallax has no wrap point: the same cloud stays recognisable
    // through long gallops and camera pans, with only a small distant drift.
    const parallax = Math.sin((cameraX - originX) / 6000) * W * .045;
    const x = clamp(W * (picture || shortLandscape ? .24 : .72) + parallax + drift, margin + width / 2, W - margin - width / 2);
    // The short landscape sky has a handwritten label to the right. Its open
    // left quarter is below the goal note and above the stick and shoreline.
    let y = H * (portrait ? .26 : shortLandscape ? .29 : .22);
    if (sun) {
        const gap = Math.max(12, Math.min(W, H) * .025);
        const left = x - width / 2, right = x + width / 2;
        // Begin moving down before touching the outer sun rays. This smooth
        // shoulder avoids a sudden jump when the camera brings the sun past us.
        const distance = Math.max(sun.x - right, left - (sun.x + sun.width), 0);
        const influence = 1 - smooth((distance - gap) / Math.max(36, W * .075));
        const below = sun.y + sun.height + gap + height / 2;
        y += Math.max(0, below - y) * influence;
    }
    y = clamp(y, margin + height / 2, H - margin - height / 2);
    return { x, y, scale, width, height };
}
