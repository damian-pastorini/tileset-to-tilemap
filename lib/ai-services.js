/**
 *
 * Reldens - AiServices
 *
 */

const { ClusterDetector } = require('./cluster-detector');
const { ClusterCropper } = require('./cluster-cropper');
const { ClusterNamer } = require('./cluster-namer');

const detector = new ClusterDetector();
const cropper = new ClusterCropper();
const namer = new ClusterNamer();

module.exports = { detector, cropper, namer };
