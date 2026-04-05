/**
 * Chart Generator Utility
 *
 * Provides unified functions for generating Vega-Lite charts and converting to SVG
 */

import * as vega from "vega";
import * as vegaLite from "vega-lite";
import canvas from "canvas";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

/**
 * Generate timestamp string for filenames: YYYYMMDD-HHmmss
 */
function formatTimestamp(date = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
        date.getFullYear() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) +
        "-" +
        pad(date.getHours()) +
        pad(date.getMinutes()) +
        pad(date.getSeconds())
    );
}

/**
 * Generate filename if not provided
 */
function generateFilename(chartType, title) {
    // Sanitize title for filename
    const sanitizedTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 50);
    return `${sanitizedTitle}-${formatTimestamp()}.svg`;
}

/**
 * Create Vega-Lite spec for line chart
 */
export function createLineChartSpec(title, xAxis, series, yAxisName) {
    const data = [];

    // Transform data to Vega-Lite format
    for (let i = 0; i < xAxis.length; i++) {
        for (const s of series) {
            data.push({
                x: xAxis[i],
                y: s.data[i],
                series: s.name,
            });
        }
    }

    return {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        width: 800,
        height: 500,
        title: {
            text: title,
            fontSize: 18,
            anchor: "middle",
        },
        data: { values: data },
        encoding: {
            x: {
                field: "x",
                type: "nominal",
                title: xAxis.length > 0 && typeof xAxis[0] === "number" ? "Value" : "Category",
            },
            y: {
                field: "y",
                type: "quantitative",
                title: yAxisName || "Value",
            },
            color: {
                field: "series",
                type: "nominal",
                legend: { title: "Series" },
            },
        },
        mark: "line",
        resolve: { scale: { color: "independent" } },
    };
}

/**
 * Create Vega-Lite spec for bar chart
 */
export function createBarChartSpec(title, xAxis, series, yAxisName) {
    const data = [];

    for (let i = 0; i < xAxis.length; i++) {
        for (const s of series) {
            data.push({
                x: xAxis[i],
                y: s.data[i],
                series: s.name,
            });
        }
    }

    return {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        width: 800,
        height: 500,
        title: {
            text: title,
            fontSize: 18,
            anchor: "middle",
        },
        data: { values: data },
        encoding: {
            x: {
                field: "x",
                type: "nominal",
                title: "Category",
            },
            y: {
                field: "y",
                type: "quantitative",
                title: yAxisName || "Value",
            },
            color: {
                field: "series",
                type: "nominal",
                legend: { title: "Series" },
            },
        },
        mark: "bar",
        resolve: { scale: { color: "independent" } },
    };
}

/**
 * Create Vega-Lite spec for pie chart
 */
export function createPieChartSpec(title, data) {
    return {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        width: 500,
        height: 500,
        title: {
            text: title,
            fontSize: 18,
            anchor: "middle",
        },
        data: { values: data },
        mark: { type: "arc", innerRadius: 0 },
        encoding: {
            theta: { field: "value", type: "quantitative", stack: true },
            color: {
                field: "name",
                type: "nominal",
                legend: { title: "Category" },
            },
            tooltip: [
                { field: "name", type: "nominal", title: "Name" },
                { field: "value", type: "quantitative", title: "Value" },
            ],
        },
    };
}

/**
 * Create Vega-Lite spec for scatter chart
 */
export function createScatterChartSpec(title, series, xAxisName, yAxisName) {
    const data = [];

    for (const s of series) {
        for (const point of s.data) {
            data.push({
                x: point[0],
                y: point[1],
                series: s.name,
            });
        }
    }

    return {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        width: 800,
        height: 500,
        title: {
            text: title,
            fontSize: 18,
            anchor: "middle",
        },
        data: { values: data },
        encoding: {
            x: {
                field: "x",
                type: "quantitative",
                title: xAxisName || "X",
                scale: { type: "log" },
            },
            y: {
                field: "y",
                type: "quantitative",
                title: yAxisName || "Y",
                scale: { type: "log" },
            },
            color: {
                field: "series",
                type: "nominal",
                legend: { title: "Series" },
            },
        },
        mark: "circle",
        resolve: { scale: { color: "independent" } },
    };
}

/**
 * Create Vega spec for radar chart using polar coordinates
 * Pre-calculates all positions to avoid signal expression issues in Node.js
 */
export function createRadarChartSpec(title, indicators, series) {
    const numIndicators = indicators.length;
    const centerX = 250;
    const centerY = 250;
    const maxRadius = 200;

    // Helper: convert polar to cartesian
    const polarToCartesian = (radius, angleDeg) => {
        const angleRad = (angleDeg - 90) * (Math.PI / 180);
        return {
            x: centerX + radius * Math.cos(angleRad),
            y: centerY + radius * Math.sin(angleRad),
        };
    };

    // Generate grid levels (circles at 20%, 40%, 60%, 80%, 100%)
    const gridLevels = [];
    for (let level = 1; level <= 5; level++) {
        const radius = (level / 5) * maxRadius;
        let pathD = "";
        for (let i = 0; i <= numIndicators; i++) {
            const angle = (i * 360) / numIndicators;
            const pos = polarToCartesian(radius, angle);
            pathD += (i === 0 ? "M" : "L") + pos.x + "," + pos.y;
        }
        pathD += "Z";
        gridLevels.push({ path: pathD, level });
    }

    // Generate axis lines (from center to each indicator)
    const axisLines = [];
    for (let i = 0; i < numIndicators; i++) {
        const angle = (i * 360) / numIndicators;
        const start = polarToCartesian(0, angle);
        const end = polarToCartesian(maxRadius, angle);
        axisLines.push({
            x1: start.x,
            y1: start.y,
            x2: end.x,
            y2: end.y,
            key: indicators[i].name,
        });
    }

    // Generate labels
    const labels = [];
    for (let i = 0; i < numIndicators; i++) {
        const angle = (i * 360) / numIndicators;
        const pos = polarToCartesian(maxRadius + 20, angle);
        labels.push({
            x: pos.x,
            y: pos.y,
            text: indicators[i].name,
            angle: angle,
        });
    }

    // Generate series polygons and points
    const seriesPolygons = [];
    const seriesPoints = [];
    for (const s of series) {
        let pathD = "";
        for (let i = 0; i < numIndicators; i++) {
            const value = s.data[i];
            const maxValue = indicators[i].max;
            const normalized = (value / maxValue) * maxRadius;
            const angle = (i * 360) / numIndicators;
            const pos = polarToCartesian(normalized, angle);
            pathD += (i === 0 ? "M" : "L") + pos.x + "," + pos.y;

            // Add individual point data
            seriesPoints.push({
                x: pos.x,
                y: pos.y,
                value: value,
                key: indicators[i].name,
                series: s.name,
            });
        }
        pathD += "Z";

        seriesPolygons.push({
            name: s.name,
            path: pathD,
        });
    }

    // Color mapping for series
    const colorScheme = ["#4c78a8", "#f58518", "#54a24b", "#e45756", "#b279a2", "#ff9daa", "#9d755d", "#bab0ac"];

    return {
        $schema: "https://vega.github.io/schema/vega/v5.json",
        description: `Radar chart: ${title}`,
        width: 500,
        height: 500,
        padding: 20,
        background: "white",
        data: [
            { name: "grid", values: gridLevels },
            { name: "axes", values: axisLines },
            { name: "labels", values: labels },
            { name: "polygons", values: seriesPolygons },
            { name: "points", values: seriesPoints },
        ],
        marks: [
            // Grid circles (background)
            {
                type: "path",
                from: { data: "grid" },
                encode: {
                    enter: {
                        path: { field: "path" },
                        fill: { value: "none" },
                        stroke: { value: "#ddd" },
                        strokeWidth: { value: 1 },
                    },
                },
            },
            // Axis lines
            {
                type: "line",
                from: { data: "axes" },
                encode: {
                    enter: {
                        x1: { field: "x1" },
                        y1: { field: "y1" },
                        x2: { field: "x2" },
                        y2: { field: "y2" },
                        stroke: { value: "#ddd" },
                        strokeWidth: { value: 1 },
                    },
                },
            },
            // Axis labels
            {
                type: "text",
                from: { data: "labels" },
                encode: {
                    enter: {
                        x: { field: "x" },
                        y: { field: "y" },
                        text: { field: "text" },
                        align: { value: "middle" },
                        baseline: { value: "middle" },
                        fontSize: { value: 11 },
                        fill: { value: "#333" },
                    },
                },
            },
            // Series polygons
            {
                type: "path",
                from: { data: "polygons" },
                encode: {
                    enter: {
                        path: { field: "path" },
                        fill: { value: "transparent" },
                        stroke: { field: "name", type: "ordinal", scale: "color" },
                        strokeWidth: { value: 2 },
                        fillOpacity: { value: 0.1 },
                    },
                },
            },
            // Series points
            {
                type: "symbol",
                from: { data: "points" },
                encode: {
                    enter: {
                        x: { field: "x" },
                        y: { field: "y" },
                        size: { value: 40 },
                        fill: { field: "series", type: "ordinal", scale: "color" },
                        stroke: { value: "white" },
                        strokeWidth: { value: 1.5 },
                    },
                },
            },
        ],
        scales: [
            {
                name: "color",
                type: "ordinal",
                domain: series.map((s) => s.name),
                range: colorScheme,
            },
        ],
        title: {
            text: title,
            anchor: "middle",
            fontSize: 16,
            fontWeight: "bold",
        },
    };
}

/**
 * Legacy function - kept for backward compatibility but now returns polar chart
 */
export function createRadarChartSpecLegacy(title, indicators, series) {
    // Use simple bar chart in polar coordinates
    const data = [];
    const numIndicators = indicators.length;

    for (let i = 0; i < numIndicators; i++) {
        const key = indicators[i].name;
        const maxValue = indicators[i].max;
        const angle = (i * 360) / numIndicators;

        for (const s of series) {
            const value = s.data[i];
            data.push({
                key: key,
                value: value,
                angle: angle,
                series: s.name,
                max: maxValue,
            });
        }
    }

    return {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        description: `Radar chart: ${title}`,
        width: 500,
        height: 500,
        title: { text: title, fontSize: 18 },
        data: { values: data },
        encoding: {
            theta: { field: "angle", type: "quantitative", stack: null },
            radius: {
                field: "value",
                type: "quantitative",
                scale: { type: "sqrt", domain: [0, 100] },
            },
            color: { field: "series", type: "nominal" },
        },
        layer: [
            {
                mark: {
                    type: "arc",
                    innerRadius: 20,
                    outerRadius: 200,
                },
            },
            {
                mark: { type: "text", radius: 220 },
                encoding: {
                    text: { field: "key", type: "nominal" },
                },
            },
        ],
        view: { stroke: null },
    };
}

/**
 * Convert Vega-Lite or Vega spec to SVG string
 */
export async function specToSvg(spec) {
    let vegaSpec;

    // Check if it's a Vega-Lite spec (has vega-lite in $schema)
    if (spec.$schema && spec.$schema.includes("vega-lite")) {
        // Compile Vega-Lite spec to Vega spec
        vegaSpec = vegaLite.compile(spec).spec;
    } else {
        // Already a Vega spec
        vegaSpec = spec;
    }

    // Create Vega view
    const view = new vega.View(vega.parse(vegaSpec), {
        loader: vega.loader(),
        renderer: "none",
    });

    // Generate SVG
    const svg = await view.toSVG();

    // Clean up
    view.finalize();

    return svg;
}

/**
 * Save SVG to file and update scope
 */
export async function saveChartToFile(svg, chartsDir, filename, workspaceManager, scopeManager) {
    await mkdir(chartsDir, { recursive: true });
    const filePath = join(chartsDir, filename);

    await writeFile(filePath, svg, "utf-8");

    return filePath;
}

/**
 * Update scope with chart metadata
 */
export async function updateScopeWithChart(scopeManager, chartMetadata) {
    let scope = scopeManager.get();
    if (!scope) {
        scope = await scopeManager.read();
    }
    scope = scope || {};

    const charts = scope.charts || [];
    charts.push(chartMetadata);

    const updatedScope = {
        ...scope,
        charts,
    };

    await scopeManager.write(updatedScope);

    return updatedScope;
}

/**
 * Create chart metadata object
 */
export function createChartMetadata(chartType, filename, filePath, title, description) {
    return {
        name: filename,
        filePath,
        type: chartType,
        title,
        description: description || `Generated ${chartType} chart`,
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Generate chart (main entry point for chart skills)
 *
 * @param {Object} config - Chart configuration
 * @param {string} config.type - Chart type ('line', 'bar', 'pie', 'scatter', 'radar')
 * @param {string} config.title - Chart title
 * @param {*} config.data - Chart data (format depends on type)
 * @param {string} [config.filename] - Output filename (optional)
 * @param {string} [config.description] - Chart description (optional)
 * @param {Object} config.workspaceManager - Workspace manager instance
 * @param {Object} config.scopeManager - Scope manager instance
 * @returns {Promise<Object>} - Result with filePath and metadata
 */
export async function generateChart(config) {
    const {
        type,
        title,
        data,
        filename: inputFilename,
        description,
        workspaceManager,
        scopeManager,
        yAxisName,
        xAxisName,
        indicators,
    } = config;

    // Validate workspace is initialized
    if (!workspaceManager.isInitialized()) {
        throw new Error("Workspace not initialized. Charts require a workspace context.");
    }

    // Get charts directory
    const chartsDir = workspaceManager.getChartsPath();

    // Generate spec based on type
    let spec;
    switch (type) {
        case "line":
            spec = createLineChartSpec(title, data.xAxis, data.series, yAxisName);
            break;
        case "bar":
            spec = createBarChartSpec(title, data.xAxis, data.series, yAxisName);
            break;
        case "pie":
            spec = createPieChartSpec(title, data);
            break;
        case "scatter":
            spec = createScatterChartSpec(title, data.series, xAxisName, yAxisName);
            break;
        case "radar":
            spec = createRadarChartSpec(title, indicators, data.series);
            break;
        default:
            throw new Error(`Unknown chart type: ${type}`);
    }

    // Convert to SVG
    const svg = await specToSvg(spec);

    // Generate filename if not provided
    const filename = inputFilename || generateFilename(type, title);

    // Save to file
    const filePath = await saveChartToFile(svg, chartsDir, filename, workspaceManager, scopeManager);

    // Update scope
    const metadata = createChartMetadata(type, filename, filePath, title, description);
    await updateScopeWithChart(scopeManager, metadata);

    return {
        filePath,
        filename,
        metadata,
    };
}
