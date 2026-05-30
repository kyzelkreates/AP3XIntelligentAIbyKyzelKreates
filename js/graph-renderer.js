// ============================================================
// AP3X INTELLIGENT AI — GRAPH RENDERER
// Canvas-based knowledge graph visualisation
// ============================================================

const GraphRenderer = (() => {

  let canvas, ctx, animFrame;
  let nodes = [], edges = [];
  let transform = { x: 0, y: 0, scale: 1 };
  let dragging   = null;
  let dragStart  = null;
  let panStart   = null;
  let hoveredNode = null;
  let selectedNode = null;

  const COLORS = {
    project: { fill: 'rgba(212,175,55,0.85)',  stroke: '#D4AF37', glow: 'rgba(212,175,55,0.5)' },
    entity:  { fill: 'rgba(138,43,226,0.75)',  stroke: '#8A2BE2', glow: 'rgba(138,43,226,0.4)' },
    ap3x:    { fill: 'rgba(0,255,136,0.8)',    stroke: '#00FF88', glow: 'rgba(0,255,136,0.5)' },
    fleet:   { fill: 'rgba(77,163,255,0.8)',   stroke: '#4DA3FF', glow: 'rgba(77,163,255,0.4)' },
    education:{ fill:'rgba(255,200,50,0.8)',   stroke: '#FFC832', glow: 'rgba(255,200,50,0.4)' },
    health:  { fill: 'rgba(255,80,120,0.8)',   stroke: '#FF5078', glow: 'rgba(255,80,120,0.4)' },
    general: { fill: 'rgba(192,192,192,0.7)',  stroke: '#C0C0C0', glow: 'rgba(192,192,192,0.3)' }
  };

  const NODE_RADIUS = { project: 22, entity: 13, named_concept: 10 };

  function init(canvasEl, onNodeClick) {
    canvas    = canvasEl;
    ctx       = canvas.getContext('2d');
    _onNodeClick = onNodeClick;

    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('mousemove',  onMouseMove);
    canvas.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('wheel',      onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove, { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd);
    window.addEventListener('resize',     resize);
    resize();
    startLoop();
  }

  function loadGraph(graphData) {
    nodes = graphData.nodes.map(n => ({ ...n }));
    edges = graphData.edges.map(e => ({ ...e }));
    _fitToScreen();
  }

  function resize() {
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function _fitToScreen() {
    if (!nodes.length || !canvas) return;
    const xs = nodes.map(n => n.x).filter(Boolean);
    const ys = nodes.map(n => n.y).filter(Boolean);
    if (!xs.length) return;
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = maxX - minX || 1, h = maxY - minY || 1;
    const scaleX = (canvas.width  - 120) / w;
    const scaleY = (canvas.height - 120) / h;
    transform.scale = Math.min(scaleX, scaleY, 2);
    transform.x = (canvas.width  - (minX + maxX) * transform.scale) / 2;
    transform.y = (canvas.height - (minY + maxY) * transform.scale) / 2;
  }

  function startLoop() {
    if (animFrame) cancelAnimationFrame(animFrame);
    function loop() {
      draw();
      animFrame = requestAnimationFrame(loop);
    }
    loop();
  }

  function draw() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background grid
    _drawGrid();

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Edges
    for (const edge of edges) {
      const src = nodes.find(n => n.id === edge.source);
      const tgt = nodes.find(n => n.id === edge.target);
      if (!src || !tgt || src.x == null || tgt.x == null) continue;
      _drawEdge(src, tgt, edge);
    }

    // Nodes
    for (const node of nodes) {
      if (node.x == null) continue;
      _drawNode(node);
    }

    ctx.restore();

    // Tooltip
    if (hoveredNode) _drawTooltip(hoveredNode);
  }

  function _drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(212,175,55,0.04)';
    ctx.lineWidth   = 1;
    const step = 40;
    for (let x = 0; x < canvas.width; x += step) {
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
    }
    ctx.restore();
  }

  function _drawEdge(src, tgt, edge) {
    const isHighlighted = selectedNode && (selectedNode.id === src.id || selectedNode.id === tgt.id);
    ctx.save();
    ctx.globalAlpha = isHighlighted ? 0.9 : 0.3;
    ctx.strokeStyle = isHighlighted ? '#D4AF37' : '#4DA3FF';
    ctx.lineWidth   = isHighlighted ? 1.5 : 0.8;
    ctx.setLineDash(isHighlighted ? [] : [4, 4]);
    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);
    ctx.stroke();
    ctx.restore();
  }

  function _drawNode(node) {
    const r   = (NODE_RADIUS[node.type] || 14) + (selectedNode?.id === node.id ? 4 : 0);
    const col = COLORS[node.domain] || COLORS[node.type] || COLORS.general;
    const isHovered  = hoveredNode?.id  === node.id;
    const isSelected = selectedNode?.id === node.id;

    ctx.save();

    // Glow
    if (isHovered || isSelected) {
      ctx.shadowColor = col.glow;
      ctx.shadowBlur  = 24;
    }

    // Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(node.x - r*0.3, node.y - r*0.3, r*0.1, node.x, node.y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.3)');
    grad.addColorStop(1, col.fill);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = col.stroke;
    ctx.lineWidth   = isSelected ? 2.5 : 1.2;
    ctx.stroke();

    // Label
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = '#EAEAEA';
    ctx.font        = `${node.type === 'project' ? 10 : 8}px 'Courier New', monospace`;
    ctx.textAlign   = 'center';
    const label = node.label.length > 14 ? node.label.slice(0,12) + '…' : node.label;
    ctx.fillText(label, node.x, node.y + r + 12);

    ctx.restore();
  }

  function _drawTooltip(node) {
    const sx = node.x * transform.scale + transform.x;
    const sy = node.y * transform.scale + transform.y;
    const label = node.label;
    const info  = `${node.type.toUpperCase()} · ${node.domain.toUpperCase()}`;

    ctx.save();
    ctx.font = '11px Courier New, monospace';
    const w = Math.max(ctx.measureText(label).width, ctx.measureText(info).width) + 20;
    const h = 44;
    let tx = sx + 14;
    let ty = sy - 28;
    if (tx + w > canvas.width)  tx = sx - w - 14;
    if (ty < 0)                 ty = sy + 14;

    ctx.fillStyle   = 'rgba(0,0,0,0.88)';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth   = 1;
    _roundRect(ctx, tx, ty, w, h, 4);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle  = '#D4AF37';
    ctx.fillText(label, tx + 10, ty + 16);
    ctx.fillStyle  = '#C0C0C0';
    ctx.fillText(info, tx + 10, ty + 33);
    ctx.restore();
  }

  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath();
  }

  function _hitTest(mx, my) {
    const wx = (mx - transform.x) / transform.scale;
    const wy = (my - transform.y) / transform.scale;
    for (const node of [...nodes].reverse()) {
      if (node.x == null) continue;
      const r = NODE_RADIUS[node.type] || 14;
      const dx = wx - node.x, dy = wy - node.y;
      if (dx*dx + dy*dy <= r*r * 1.5) return node;
    }
    return null;
  }

  let _onNodeClick = null;

  function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = _hitTest(mx, my);
    if (hit) {
      dragging  = hit;
      dragStart = { mx, my, nx: hit.x, ny: hit.y };
    } else {
      panStart = { mx, my, tx: transform.x, ty: transform.y };
    }
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    hoveredNode = _hitTest(mx, my);
    canvas.style.cursor = hoveredNode ? 'pointer' : (panStart ? 'grabbing' : 'default');

    if (dragging && dragStart) {
      const dx = (mx - dragStart.mx) / transform.scale;
      const dy = (my - dragStart.my) / transform.scale;
      dragging.x = dragStart.nx + dx;
      dragging.y = dragStart.ny + dy;
    } else if (panStart) {
      transform.x = panStart.tx + (mx - panStart.mx);
      transform.y = panStart.ty + (my - panStart.my);
    }
  }

  function onMouseUp(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (dragging && dragStart) {
      const dist = Math.hypot(mx - dragStart.mx, my - dragStart.my);
      if (dist < 5 && _onNodeClick) {
        selectedNode = dragging;
        _onNodeClick(dragging);
      }
    }
    dragging  = null;
    dragStart = null;
    panStart  = null;
  }

  function onWheel(e) {
    e.preventDefault();
    const rect   = canvas.getBoundingClientRect();
    const mx     = e.clientX - rect.left, my = e.clientY - rect.top;
    const delta  = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(transform.scale * delta, 0.2), 5);
    transform.x = mx - (mx - transform.x) * (newScale / transform.scale);
    transform.y = my - (my - transform.y) * (newScale / transform.scale);
    transform.scale = newScale;
  }

  let touchStart = null;
  function onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const mx = t.clientX - rect.left, my = t.clientY - rect.top;
      const hit = _hitTest(mx, my);
      if (hit) { dragging = hit; dragStart = { mx, my, nx: hit.x, ny: hit.y }; }
      else      { panStart = { mx, my, tx: transform.x, ty: transform.y }; }
      touchStart = { mx, my };
    }
  }
  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const mx = t.clientX - rect.left, my = t.clientY - rect.top;
      if (dragging && dragStart) {
        dragging.x = dragStart.nx + (mx - dragStart.mx) / transform.scale;
        dragging.y = dragStart.ny + (my - dragStart.my) / transform.scale;
      } else if (panStart) {
        transform.x = panStart.tx + (mx - panStart.mx);
        transform.y = panStart.ty + (my - panStart.my);
      }
    }
  }
  function onTouchEnd(e) {
    if (dragging && touchStart) {
      const t = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const mx = t.clientX - rect.left, my = t.clientY - rect.top;
      const dist = Math.hypot(mx - touchStart.mx, my - touchStart.my);
      if (dist < 8 && _onNodeClick) { selectedNode = dragging; _onNodeClick(dragging); }
    }
    dragging = null; dragStart = null; panStart = null; touchStart = null;
  }

  function resetView() { _fitToScreen(); }
  function clearSelection() { selectedNode = null; }

  return { init, loadGraph, resize, resetView, clearSelection };
})();

window.GraphRenderer = GraphRenderer;
