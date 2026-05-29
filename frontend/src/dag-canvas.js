/**
 * DAG Canvas Renderer
 * High-performance Canvas 2D renderer with viewport culling for large DAGs
 */

export class DAGCanvasRenderer {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {Object} positionedNodes - { nodeId: { x, y, id, goal, skill, ... } }
     * @param {Array} layoutEdges - [{ from, to, fromX, fromY, toX, toY }]
     * @param {Object} nodeStatuses - { nodeId: "pending"|"running"|"completed" }
     */
    constructor(canvas, positionedNodes, layoutEdges, nodeStatuses) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nodes = positionedNodes;
        this.edges = layoutEdges;
        this.nodeStatuses = nodeStatuses || {};

        this.transform = { x: 0, y: 0, scale: 1 };
        this.minScale = 0.05;
        this.maxScale = 5;
        this.nodeWidth = 220;
        this.nodeHeight = 90;

        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.hasDragged = false;

        this.animationFrameId = null;
        this.onZoomChange = null;
        this._onNodeClickCallback = null;

        this.dpr = window.devicePixelRatio || 1;
        this.viewportWidth = 0;
        this.viewportHeight = 0;

        this._resizeObserver = null;

        this._init();
    }

    _init() {
        this._resize();
        this._setupInteractions();
        this._render();

        // Listen for resize
        this._resizeObserver = new ResizeObserver(() => {
            this._resize();
            this._render();
        });
        this._resizeObserver.observe(this.canvas.parentElement);
    }

    _resize() {
        const parent = this.canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        this.viewportWidth = rect.width;
        this.viewportHeight = rect.height;
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    _render() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = requestAnimationFrame(() => this._draw());
    }

    _draw() {
        const ctx = this.ctx;
        const { x, y, scale } = this.transform;
        const dpr = this.dpr;

        // Reset transform and clear
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);

        // Apply view transform
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Calculate visible bounds for culling
        const bounds = this._getVisibleBounds();

        // Draw edges first (behind nodes)
        for (const edge of this.edges) {
            if (this._isEdgeInViewport(edge, bounds)) {
                this._drawEdge(ctx, edge, scale);
            }
        }

        // Draw nodes
        const nodeValues = Object.values(this.nodes);
        for (const node of nodeValues) {
            if (this._isNodeInViewport(node, bounds)) {
                const status = this.nodeStatuses[node.id] || 'pending';
                this._drawNode(ctx, node, status, scale);
            }
        }

        ctx.restore();
    }

    _getVisibleBounds() {
        const { x, y, scale } = this.transform;
        return {
            left: -x / scale - 100,
            top: -y / scale - 100,
            right: (-x + this.viewportWidth) / scale + 100,
            bottom: (-y + this.viewportHeight) / scale + 100
        };
    }

    _isNodeInViewport(node, bounds) {
        return node.x + this.nodeWidth > bounds.left &&
               node.x < bounds.right &&
               node.y + this.nodeHeight > bounds.top &&
               node.y < bounds.bottom;
    }

    _isEdgeInViewport(edge, bounds) {
        const minX = Math.min(edge.fromX, edge.toX);
        const maxX = Math.max(edge.fromX, edge.toX);
        const minY = Math.min(edge.fromY, edge.toY);
        const maxY = Math.max(edge.fromY, edge.toY);
        return maxX > bounds.left && minX < bounds.right &&
               maxY > bounds.top && minY < bounds.bottom;
    }

    _drawEdge(ctx, edge, scale) {
        const { fromX, fromY, toX, toY } = edge;
        const deltaX = toX - fromX;
        const controlOffset = Math.min(Math.abs(deltaX) / 2, 80);

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.bezierCurveTo(
            fromX + controlOffset, fromY,
            toX - controlOffset, toY,
            toX, toY
        );
        ctx.strokeStyle = '#525252';
        ctx.lineWidth = 1.5 / scale; // Consistent width regardless of zoom
        ctx.stroke();

        // Draw arrowhead (hide at very small scales)
        if (scale >= 0.2) {
            this._drawArrowhead(ctx, toX, toY, fromX + controlOffset, fromY, toX - controlOffset, toY, scale);
        }
    }

    _drawArrowhead(ctx, tipX, tipY, cp1X, cp1Y, cp2X, cp2Y, scale) {
        // Calculate tangent direction at the end of the bezier curve
        const dx = tipX - cp2X;
        const dy = tipY - cp2Y;
        const angle = Math.atan2(dy, dx);
        const size = Math.max(6, 8 / scale);

        ctx.save();
        ctx.translate(tipX, tipY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-size, -size / 2.5);
        ctx.lineTo(-size, size / 2.5);
        ctx.closePath();
        ctx.fillStyle = '#525252';
        ctx.fill();
        ctx.restore();
    }

    _drawNode(ctx, node, status, scale) {
        const { id, x, y, goal, skill } = node;
        const w = this.nodeWidth;
        const h = this.nodeHeight;
        const r = 8;

        // Shadow (subtle)
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4 / scale;
        ctx.shadowOffsetX = 2 / scale;
        ctx.shadowOffsetY = 2 / scale;

        // Background
        ctx.fillStyle = '#1e1e1e';
        this._roundRect(ctx, x, y, w, h, r);
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Border based on status
        if (status === 'completed') {
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2 / scale;
        } else if (status === 'running') {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2 / scale;
        } else {
            ctx.strokeStyle = '#2a2a2a';
            ctx.lineWidth = 1 / scale;
        }
        this._roundRect(ctx, x, y, w, h, r);
        ctx.stroke();

        // Clip text to node bounds
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 2, y + 2, w - 4, h - 4);
        ctx.clip();

        // Node ID
        ctx.fillStyle = '#fbbf24';
        ctx.font = `600 ${12 / scale}px monospace`;
        ctx.textBaseline = 'middle';
        ctx.fillText(id, x + 12, y + 18);

        // Goal (truncated)
        const displayGoal = goal?.length > 35 ? goal.substring(0, 32) + '...' : goal || '';
        ctx.fillStyle = '#e5e5e5';
        ctx.font = `${13 / scale}px sans-serif`;
        ctx.fillText(displayGoal, x + 12, y + 44);

        // Skill
        if (skill) {
            ctx.fillStyle = '#a78bfa';
            ctx.font = `${11 / scale}px monospace`;
            ctx.fillText(skill, x + 12, y + 68);
        }

        // Status icon
        if (status === 'completed') {
            ctx.fillStyle = '#22c55e';
            ctx.font = `bold ${16 / scale}px sans-serif`;
            ctx.textAlign = 'right';
            ctx.fillText('✓', x + w - 12, y + 18);
            ctx.textAlign = 'left';
        } else if (status === 'running') {
            ctx.fillStyle = '#3b82f6';
            ctx.font = `bold ${16 / scale}px sans-serif`;
            ctx.textAlign = 'right';
            ctx.fillText('⟳', x + w - 12, y + 18);
            ctx.textAlign = 'left';
        }

        ctx.restore();
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    _setupInteractions() {
        const canvas = this.canvas;

        // Mouse down - start drag
        canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.hasDragged = false;
            this.dragStartX = e.clientX - this.transform.x;
            this.dragStartY = e.clientY - this.transform.y;
            canvas.style.cursor = 'grabbing';
            e.preventDefault();
        });

        // Mouse move - dragging
        const onMouseMove = (e) => {
            if (!this.isDragging) return;
            const newTransform = {
                x: e.clientX - this.dragStartX,
                y: e.clientY - this.dragStartY
            };
            // Detect if actually dragged (more than 3px)
            if (Math.abs(newTransform.x - this.transform.x) > 3 || Math.abs(newTransform.y - this.transform.y) > 3) {
                this.hasDragged = true;
            }
            this.transform.x = newTransform.x;
            this.transform.y = newTransform.y;
            this._render();
        };
        document.addEventListener('mousemove', onMouseMove);

        // Mouse up - end drag
        const onMouseUp = () => {
            this.isDragging = false;
            canvas.style.cursor = 'grab';
        };
        document.addEventListener('mouseup', onMouseUp);

        // Wheel zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.transform.scale * delta));

            // Zoom centered on mouse position
            this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
            this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
            this.transform.scale = newScale;

            this._render();
            this._notifyZoomChange();
        }, { passive: false });

        // Click - node hit testing
        canvas.addEventListener('click', (e) => {
            if (this.hasDragged) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Transform mouse coordinates to DAG space
            const dagX = (mouseX - this.transform.x) / this.transform.scale;
            const dagY = (mouseY - this.transform.y) / this.transform.scale;

            // Check if click is on a node
            const nodeValues = Object.values(this.nodes);
            for (const node of nodeValues) {
                if (dagX >= node.x && dagX <= node.x + this.nodeWidth &&
                    dagY >= node.y && dagY <= node.y + this.nodeHeight) {
                    if (this._onNodeClickCallback) {
                        this._onNodeClickCallback(node);
                    }
                    return;
                }
            }
        });

        // Touch support
        let touchStartX, touchStartY, touchStartDist;
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.hasDragged = false;
                this.dragStartX = e.touches[0].clientX - this.transform.x;
                this.dragStartY = e.touches[0].clientY - this.transform.y;
            } else if (e.touches.length === 2) {
                this.isDragging = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                touchStartDist = Math.sqrt(dx * dx + dy * dy);
            }
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && this.isDragging) {
                const newTransform = {
                    x: e.touches[0].clientX - this.dragStartX,
                    y: e.touches[0].clientY - this.dragStartY
                };
                if (Math.abs(newTransform.x - this.transform.x) > 3 || Math.abs(newTransform.y - this.transform.y) > 3) {
                    this.hasDragged = true;
                }
                this.transform.x = newTransform.x;
                this.transform.y = newTransform.y;
                this._render();
            } else if (e.touches.length === 2 && touchStartDist) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const scale = dist / touchStartDist;
                const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.transform.scale * scale));

                const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const rect = canvas.getBoundingClientRect();
                const cx = midX - rect.left;
                const cy = midY - rect.top;

                this.transform.x = cx - (cx - this.transform.x) * (newScale / this.transform.scale);
                this.transform.y = cy - (cy - this.transform.y) * (newScale / this.transform.scale);
                this.transform.scale = newScale;
                touchStartDist = dist;

                this._render();
                this._notifyZoomChange();
            }
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchend', () => {
            this.isDragging = false;
            touchStartDist = null;
        });

        // Store cleanup references
        this._cleanup = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
            }
        };
    }

    _notifyZoomChange() {
        if (this.onZoomChange) {
            this.onZoomChange({ ...this.transform });
        }
    }

    // Public API

    zoomIn() {
        this.transform.scale = Math.min(this.maxScale, this.transform.scale * 1.2);
        this._render();
        this._notifyZoomChange();
    }

    zoomOut() {
        this.transform.scale = Math.max(this.minScale, this.transform.scale / 1.2);
        this._render();
        this._notifyZoomChange();
    }

    fitToWindow() {
        const nodeValues = Object.values(this.nodes);
        if (nodeValues.length === 0) return;

        const dagWidth = Math.max(...nodeValues.map(n => n.x)) + this.nodeWidth + 80;
        const dagHeight = Math.max(...nodeValues.map(n => n.y)) + this.nodeHeight + 80;

        const padding = 60;
        const scaleX = (this.viewportWidth - padding * 2) / dagWidth;
        const scaleY = (this.viewportHeight - padding * 2) / dagHeight;
        this.transform.scale = Math.min(scaleX, scaleY, 1);
        this.transform.x = (this.viewportWidth - dagWidth * this.transform.scale) / 2;
        this.transform.y = (this.viewportHeight - dagHeight * this.transform.scale) / 2;
        this._render();
        this._notifyZoomChange();
    }

    reset() {
        this.transform = { x: 0, y: 0, scale: 1 };
        this._render();
        this._notifyZoomChange();
    }

    getTransform() {
        return { ...this.transform };
    }

    setTransform(t) {
        this.transform = { ...t };
        this._render();
    }

    updateNodeStatus(nodeId, status) {
        this.nodeStatuses[nodeId] = status;
        this._render();
    }

    onNodeClick(callback) {
        this._onNodeClickCallback = callback;
    }

    resize() {
        this._resize();
        this._render();
    }

    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this._cleanup) {
            this._cleanup();
        }
    }
}
