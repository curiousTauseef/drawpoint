"use strict";

import {breakPoint, clone,  scale, extractPoint} from "./point";
import {simpleQuadratic} from "./curve";

/**
 * Styling option to not show stroke or fill
 * @readonly
 * @type {string}
 */
export const none = "rgba(0,0,0,0)";

/**
 * Draw the path formed by the list of drawpoints
 * @param {Context2DTracked} ctx Context2D to render to, if it exists
 * @param {Object[]} points Ordered list of draw points, each with x and y
 */
export function drawPoints(ctx, ...points) {
    // given ctx and a list of points, draw points between them based on how many control points
    // are defined for each
    // does not begin a path or fill or stroke (just moves pen between the points)
    if (points.length < 1) {
        return;
    }
    let startPoint = points[0];
    // if null is passed through, just continue from last location
    if (startPoint) {
        if (startPoint === breakPoint) {
            startPoint = points[1];
        }
        if (startPoint && startPoint.hasOwnProperty("x")) {
            ctx.moveTo(startPoint.x, startPoint.y);
        }
    }
    // for every point after
    for (let i = 1, len = points.length; i < len; ++i) {
        let p = points[i];
        // allow calls with nonexistent points so that different drawing modes can be
        // consolidated
        if (!p) {
            // console.log("don't have point #", i);
            continue;
        }
        if (p === breakPoint) {
            ++i;
            if (i < points.length) {
                p = points[i];
                ctx.moveTo(p.x, p.y);
            }
        } else if (p.cp2 && p.cp1) {
            ctx.bezierCurveTo(p.cp1.x, p.cp1.y, p.cp2.x, p.cp2.y, p.x, p.y, p.traceOptions);
        } else if (p.cp1) {
            ctx.quadraticCurveTo(p.cp1.x, p.cp1.y, p.x, p.y, p.traceOptions);
        } else if (p.cp2) {
            ctx.quadraticCurveTo(p.cp2.x, p.cp2.y, p.x, p.y, p.traceOptions);
        } else if (p.hasOwnProperty("x")) {
            ctx.lineTo(p.x, p.y);
        }
    }
}

/**
 * Get the drawpoints for a circle
 * @param {object} center Point at the center of the circle
 * @param {number} radius Radius in cm
 * @returns {object[]} List of draw points for this circle (could be passed to guiMenuItem)
 */
export function drawCircle(center, radius) {
    const stretch = 0.552284749831 * radius;
    let top = {
        x: center.x,
        y: center.y + radius
    };
    let right = {
        x: center.x + radius,
        y: center.y
    };
    let bot = {
        x: center.x,
        y: center.y - radius
    };
    let left = {
        x: center.x - radius,
        y: center.y
    };
    top.cp1 = {
        x: left.x,
        y: left.y + stretch
    };
    top.cp2 = {
        x: top.x - stretch,
        y: top.y
    };
    right.cp1 = {
        x: top.x + stretch,
        y: top.y
    };
    right.cp2 = {
        x: right.x,
        y: right.y + stretch
    };
    bot.cp1 = {
        x: right.x,
        y: right.y - stretch
    };
    bot.cp2 = {
        x: bot.x + stretch,
        y: bot.y
    };
    left.cp1 = {
        x: bot.x - stretch,
        y: bot.y
    };
    left.cp2 = {
        x: left.x,
        y: left.y - stretch
    };
    // doesn't actually matter in which order you draw them
    return [top, right, bot, left, top];
}

export function drawSpecificCurl(left, center, right) {
    const p1 = extractPoint(left);
    const p2 = extractPoint(center);
    const p3 = extractPoint(right);

    {
        const {t = 0.5, deflection = 0.5} = left;
        p2.cp1 = simpleQuadratic(p1, p2, t, deflection);
    }
    {
        const {t = 0.5, deflection = 0.5} = right;
        p3.cp1 = simpleQuadratic(p1, p2, t, deflection);
    }
    return [p1, p2, p3];
}


/**
 * Debug the curve going into a drawpoint. Use by wrapping a drawpoint with it when returning
 * to guiMenuItem.
 * @param {object} pt
 * @param {object} traceOptions Options for how to show the points
 * @returns {*}
 */
export function tracePoint(pt, options) {
    if (!options) {
        options = {radius:1};
    } else if (typeof options === "number") {
        // convenience for defining radius of trace point
        options = {radius:options};
    }
    pt.traceOptions = {point:options};
    return pt;
}



/**
 * Given a curve defined by (start, end), return a draw point such that (end, returned point) looks identical,
 * but travels in the opposite direction.
 * @param start
 * @param end
 * @returns {*}
 */
export function reverseDrawPoint(start, end) {
    if (!start || !end) {
        return start;
    }
    return {
        x  : start.x,
        y  : start.y,
        cp1: clone(end.cp2),
        cp2: clone(end.cp1)
    };
}

/**
 * For a bezier curve point, get a control point on the other side of the point so that the
 * curve is smooth.
 * @param {point} pt End point of a bezier curve (must have 2nd control point)
 * @param {number} scaleValue How much back to extend the continuing control point.
 * A value of 1 produces a symmetric curve.
 * @returns {{x, y}|{x: number, y: number}|*} Continuing control point
 */
export function getSmoothControlPoint(pt, scaleValue) {
    if (pt.hasOwnProperty("cp2") === false) {
        throw new Error("point has no second control point; can't get smooth control point");
    }
    return scale(pt, pt.cp2, -scaleValue);
}

