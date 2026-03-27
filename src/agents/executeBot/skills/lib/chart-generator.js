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
 * Create Vega-Lite spec for radar chart
 */
export function createRadarChartSpec(title, indicators, series) {
    // Transform data for radar chart using polar coordinates
    const data = [];
    const numIndicators = indicators.length;

    for (const s of series) {
        for (let i = 0; i < numIndicators; i++) {
            const angle = (2 * Math.PI * i) / numIndicators;
            const max = indicators[i].max;
            const value = s.data[i];
            const normalized = (value / max) * 100;

            // Pre-calculate trigonometric functions (Vega-Lite doesn't support radians)
            const x = normalized * Math.cos(angle);
            const y = normalized * Math.sin(angle);

            data.push({
                x,
                y,
                indicator: indicators[i].name,
                series: s.name,
                value: value,
                angle: (i * 360) / numIndicators,
            });
        }
    }

    return {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        width: 600,
        height: 600,
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
                axis: null,
                scale: { domain: [-120, 120] },
            },
            y: {
                field: "y",
                type: "quantitative",
                axis: null,
                scale: { domain: [-120, 120] },
            },
            color: {
                field: "series",
                type: "nominal",
                legend: { title: "Series" },
            },
            tooltip: [
                { field: "indicator", type: "nominal", title: "Indicator" },
                { field: "value", type: "quantitative", title: "Value" },
            ],
        },
        mark: "line",
        resolve: { scale: { color: "independent" } },
        layer: [
            {
                mark: "line",
            },
            {
                mark: "circle",
                size: 100,
            },
        ],
    };
}

/**
 * Convert Vega-Lite spec to SVG string
 */
export async function specToSvg(spec) {
    // Compile Vega-Lite spec to Vega spec
    const vegaSpec = vegaLite.compile(spec).spec;

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
