'use strict';

const EventEmitter = require(`events`).EventEmitter;

const ee = new EventEmitter();

// Setting module.exports directly to ee causes eslint-more-naming-conventions to be set off.
module.exports.ee = ee;