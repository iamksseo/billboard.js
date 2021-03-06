/**
 * Copyright (c) 2017 NAVER Corp.
 * billboard.js project is licensed under the MIT license
 */
import {select as d3Select} from "d3-selection";
import {
	scaleOrdinal as d3ScaleOrdinal,
	schemeCategory10 as d3SchemeCategory10
} from "d3-scale";
import ChartInternal from "./ChartInternal";
import {notEmpty, extend, isFunction} from "./util";

/**
 * Set pattern's background color
 * (it adds a <rect> element to simulate bg-color)
 * @param {SVGPatternElement} pattern SVG pattern element
 * @param {String} color Color string
 * @param {String} id ID to be set
 * @return {{id: string, node: SVGPatternElement}}
 * @private
 */
const colorizePattern = (pattern, color, id) => {
	const node = d3Select(pattern.cloneNode(true));

	node
		.attr("id", id)
		.insert("rect", ":first-child")
		.attr("width", node.attr("width"))
		.attr("height", node.attr("height"))
		.style("fill", color);

	return {
		id,
		node: node.node()
	};
};

extend(ChartInternal.prototype, {
	generateColor() {
		const $$ = this;
		const config = $$.config;
		const colors = config.data_colors;
		const callback = config.data_color;
		const ids = [];
		let pattern = notEmpty(config.color_pattern) ?
			config.color_pattern : d3ScaleOrdinal(d3SchemeCategory10).range();
		const originalColorPattern = pattern;


		if (isFunction(config.color_tiles)) {
			const tiles = config.color_tiles();

			// Add background color to patterns
			const colorizedPatterns = pattern.map((p, index) => {
				const color = p.replace(/[#\(\)\s,]/g, "");
				const id = `${$$.datetimeId}-pattern-${color}-${index}`;

				return colorizePattern(tiles[index % tiles.length], p, id);
			});

			pattern = colorizedPatterns.map(p => `url(#${p.id})`);
			$$.patterns = colorizedPatterns;
		}

		return function(d) {
			const id = d.id || (d.data && d.data.id) || d;
			const isLine = $$.isTypeOf(id, ["line", "spline", "step"]) || !$$.config.data_types[id];

			let color;


			// if callback function is provided
			if (colors[id] instanceof Function) {
				color = colors[id](d);

			// if specified, choose that color
			} else if (colors[id]) {
				color = colors[id];

			// if not specified, choose from pattern
			} else {
				if (ids.indexOf(id) < 0) { ids.push(id); }

				color = isLine ? originalColorPattern[ids.indexOf(id) % originalColorPattern.length] :
					pattern[ids.indexOf(id) % pattern.length];

				colors[id] = color;
			}

			return callback instanceof Function ?
				callback(color, d) : color;
		};
	},

	generateLevelColor() {
		const $$ = this;
		const config = $$.config;
		const colors = config.color_pattern;
		const threshold = config.color_threshold;

		const asValue = threshold.unit === "value";
		const max = threshold.max || 100;
		const values = threshold.values &&
			threshold.values.length ? threshold.values : [];

		return notEmpty(threshold) ? function(value) {
			let color = colors[colors.length - 1];

			for (let i = 0, v; i < values.length; i++) {
				v = asValue ? value : (value * 100 / max);
				if (v < values[i]) {
					color = colors[i];
					break;
				}
			}

			return color;
		} : null;
	}
});
