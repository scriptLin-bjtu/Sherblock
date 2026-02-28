/**
 * ECharts Client for Chart Generation
 *
 * Provides utilities for generating charts using ECharts and saving them as images.
 * Supports PNG, JPEG, WebP, and SVG formats with theme system.
 */

import { createCanvas } from 'canvas';
import * as echarts from 'echarts';
import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

/**
 * Chart themes configuration
 */
export const themes = {
    light: {
        backgroundColor: '#ffffff',
        textColor: '#333333',
        axisColor: '#666666',
        splitLineColor: '#eeeeee',
        colors: [
            '#5470c6', '#91cc75', '#fac858', '#ee6666',
            '#73c0de', '#3ba272', '#fc8452', '#9a60b4',
            '#ea7ccc'
        ]
    },
    dark: {
        backgroundColor: '#1a1a1a',
        textColor: '#eeeeee',
        axisColor: '#aaaaaa',
        splitLineColor: '#333333',
        colors: [
            '#5470c6', '#91cc75', '#fac858', '#ee6666',
            '#73c0de', '#3ba272', '#fc8452', '#9a60b4',
            '#ea7ccc'
        ]
    }
};

/**
 * Get theme configuration
 * @param {string} themeName - Theme name ('light' or 'dark')
 * @returns {Object} Theme configuration
 */
export function getTheme(themeName = 'light') {
    return themes[themeName] || themes.light;
}

/**
 * Generate an ECharts chart and save as an image
 * @param {Object} option - ECharts configuration object
 * @param {string} outputPath - Output file path
 * @param {Object} options - Options
 * @returns {Promise<Object>} Returns file path and chart info
 */
export async function generateChart(option, outputPath, {
    format = 'png',
    width = 800,
    height = 600,
    theme = 'light',
    colors = null,
    backgroundColor = null
} = {}) {
    try {
        // Ensure output directory exists
        await mkdir(dirname(outputPath), { recursive: true });

        // Get theme configuration
        const themeConfig = getTheme(theme);

        // Apply theme to option
        const mergedOption = {
            ...option,
            backgroundColor: backgroundColor || option.backgroundColor || themeConfig.backgroundColor
        };

        // Apply custom colors if provided
        if (colors) {
            mergedOption.color = colors;
        } else if (!mergedOption.color) {
            mergedOption.color = themeConfig.colors;
        }

        // Handle SVG format separately
        if (format === 'svg') {
            return await generateSVGChart(mergedOption, outputPath, { width, height });
        }

        // Create canvas for raster formats
        const canvas = createCanvas(width, height);
        echarts.setPlatformAPI({ createCanvas: () => canvas });

        // Initialize chart instance
        const chart = echarts.init(canvas);

        // Set chart options
        chart.setOption(mergedOption);

        // Format mapping
        const formatMap = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'webp': 'image/webp'
        };

        // Generate image buffer
        const buffer = canvas.toBuffer(formatMap[format] || 'image/png');

        // Write file
        await writeFile(outputPath, buffer);

        // Cleanup resources
        chart.dispose();

        return {
            success: true,
            filePath: outputPath,
            format,
            width,
            height,
            message: `Chart saved to ${outputPath}`
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate an ECharts chart as SVG
 * @param {Object} option - ECharts configuration object
 * @param {string} outputPath - Output file path
 * @param {Object} options - Options
 * @returns {Promise<Object>} Returns file path and chart info
 */
async function generateSVGChart(option, outputPath, { width = 800, height = 600 } = {}) {
    try {
        // Create canvas for SVG generation
        const canvas = createCanvas(width, height);
        echarts.setPlatformAPI({ createCanvas: () => canvas });

        // Initialize chart instance
        const chart = echarts.init(canvas);

        // Set chart options
        chart.setOption(option);

        // Render SVG using ECharts' SVG renderer
        const svgData = chart.getDom().getSVGDataURL();

        // Extract SVG content from data URL
        const svgContent = svgData.replace(/^data:image\/svg\+xml;base64,/, '');
        const buffer = Buffer.from(svgContent, 'base64');

        // Write file
        await writeFile(outputPath, buffer);

        // Cleanup resources
        chart.dispose();

        return {
            success: true,
            filePath: outputPath,
            format: 'svg',
            width,
            height,
            message: `SVG chart saved to ${outputPath}`
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Export SVG chart function
 */
export { generateSVGChart };

/**
 * Format successful result
 */
export function formatChartResult(result, skillName) {
    return {
        status: 'success',
        skill: skillName,
        ...result
    };
}

/**
 * Format error result
 */
export function formatChartError(error, skillName) {
    return {
        status: 'error',
        skill: skillName,
        error: error.message,
        message: `Failed to generate chart: ${error.message}`
    };
}
