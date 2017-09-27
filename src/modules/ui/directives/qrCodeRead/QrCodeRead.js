(function () {
    'use strict';

    /**
     * @param {Base} Base
     * @param {JQuery} $element
     * @param {app.utils.mediaStream} mediaStream
     * @param {Poll} Poll
     * @returns {QrCodeRead}
     */
    const controller = function (Base, $element, mediaStream, Poll) {

        class QrCodeRead extends Base {

            constructor() {
                super();
                /**
                 * @type {number}
                 */
                this.maxWidth = null;
                /**
                 * @type {number}
                 */
                this.maxHeight = null;
                /**
                 * @type {string}
                 */
                this.position = null;
                /**
                 * @type {boolean}
                 */
                this.isWatched = false;
                /**
                 * @type {HTMLCanvasElement}
                 */
                this.canvas = null;
                /**
                 * @type {CanvasRenderingContext2D}
                 */
                this.ctx = null;
                /**
                 * @type {HTMLDivElement}
                 */
                this.popapNode = null;
                /**
                 * @type {HTMLMediaElement}
                 */
                this.video = document.createElement('VIDEO');
                /**
                 * @type {MediaStream}
                 */
                this.stream = null;
                /**
                 * @type {Wrap}
                 */
                this.worker = null;
                /**
                 * @type {Function}
                 */
                this.onRead = null;

                this.observe(['width', 'height'], this._onChangeSize);
                this.observe('isWatched', this._onChangeWatched);
            }

            $postLink() {
                this.maxWidth = Number(this.maxWidth);
                this.maxHeight = Number(this.maxHeight);
                if (!this.maxWidth || !this.maxHeight) {
                    throw new Error('Has no qrCode reader size!');
                }
            }

            $onDestroy() {
                super.$onDestroy();
                this._stopStream();
                if (this.worker) {
                    this.worker.terminate();
                }
                if (this.popapNode) {
                    document.body.removeChild(this.popapNode);
                }
            }

            watchQrCode() {
                if (this.isWatched) {
                    this._stopWatchQrCode();
                    return null;
                }

                this.isWatched = true;
                if (!this.popapNode) {
                    this._createPopup();
                }
                if (!this.worker) {
                    this._createWorker();
                }
                mediaStream.create()
                    .then((stream) => {
                        this.stream = stream;
                        this._loadVideoSize()
                            .then((size) => {
                                this._currentSize(size);
                                this.video.play();
                                const getData = this._decodeImage.bind(this);
                                const applyData = this._checkStop.bind(this);
                                this.poll = new Poll(getData, applyData, 50);
                            });
                        this.video.src = stream.url;
                    });
            }

            /**
             * @private
             */
            _onChangeWatched() {
                this.popapNode.classList.toggle('active', this.isWatched);
            }

            /**
             * @private
             */
            _onChangeSize() {
                this._addPopupSize();
                this._setPopupPosition();
            }

            /**
             * @return {Promise}
             * @private
             */
            _loadVideoSize() {
                return new Promise((resolve) => {
                    const handler = () => {
                        resolve({ width: this.video.videoWidth, height: this.video.videoHeight });
                        this.video.removeEventListener('loadedmetadata', handler, false);
                    };
                    this.video.addEventListener('loadedmetadata', handler, false);
                });
            }

            /**
             * @private
             */
            _stopWatchQrCode() {
                this.isWatched = false;
                if (this.poll) {
                    this.poll.destroy();
                    this.poll = null;
                }
                this._stopStream();
            }

            /**
             * @param size
             * @private
             */
            _currentSize(size) {
                const factor = Math.min(this.maxWidth / size.width, this.maxHeight / size.height);

                this.width = Math.round(size.width * factor);
                this.height = Math.round(size.height * factor);
            }

            /**
             * @return {Promise<any>}
             * @private
             */
            _decodeImage() {
                return this.worker.process((qr, frame) => {
                    return new Promise((resolve) => {
                        qr.callback = function (error, result) {
                            if (error) {
                                resolve(null);
                            } else {
                                resolve(result);
                            }
                        };
                        qr.decode(frame);
                    });
                }, this._getFrame());
            }

            /**
             * @return {ImageData}
             * @private
             */
            _getFrame() {
                this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
                return this.ctx.getImageData(0, 0, this.width, this.height);
            }

            /**
             * @private
             */
            _createWorker() {
                this.worker = workerWrapper.create(() => new QrCode(), {
                    libs: ['/node_modules/qrcode-reader/dist/index.min.js']
                });
            }

            /**
             * @private
             */
            _stopStream() {
                if (this.stream) {
                    this.stream.stop();
                    this.stream = null;
                }
            }

            /**
             * @param data
             * @private
             */
            _checkStop(data) {
                if (data) {
                    this._stopWatchQrCode();
                    this.onRead({ result: data.result });
                }
            }

            /**
             * @private
             */
            _createPopup() {
                this.popapNode = document.createElement('DIV');
                this.popapNode.classList.add('qr-code-reader-popup');
                this.popapNode.appendChild(this.video);
                this.canvas = document.createElement('CANVAS');
                this.ctx = this.canvas.getContext('2d');
                document.body.append(this.popapNode);
            }

            /**
             * @private
             */
            _setPopupPosition() {
                const $btn = $element.find('.btn');
                const offset = $btn.offset();
                $(this.popapNode)
                    .offset({
                        top: offset.top - this.height - 10,
                        left: offset.left - (this.width - $btn.width()) / 2
                    });
            }

            /**
             * @private
             */
            _addPopupSize() {
                this.canvas.width = this.width;
                this.canvas.height = this.height;
                this.popapNode.style.width = `${this.width}px`;
                this.popapNode.style.height = `${this.height}px`;
            }

        }

        return new QrCodeRead();
    };

    controller.$inject = ['Base', '$element', 'mediaStream', 'Poll'];

    angular.module('app.ui')
        .component('wQrCodeRead', {
            bindings: {
                maxWidth: '@',
                maxHeight: '@',
                position: '@',
                onRead: '&'
            },
            template: '<div ng-class="{active: $ctrl.isWatched}" class="btn" ng-click="$ctrl.watchQrCode()"></div>',
            controller
        });
})();
