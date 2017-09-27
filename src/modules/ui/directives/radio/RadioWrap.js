(function () {
    'use strict';

    /**
     * @param {Base} Base
     * @returns {RadioWrap}
     */
    const controller = function (Base) {

        class RadioWrap extends Base {

            constructor() {
                super();
                this.children = [];
                this.name = `name-${Math.random()}-${Date.now()}`;
            }

            addRadio(item) {
                item.name = this.name;
                this.children.push(item);
            }

            getValue() {
                return this.value;
            }

            setValue(newValue) {
                this.value = newValue;
            }

        }

        return new RadioWrap();
    };

    controller.$inject = ['Base'];

    angular.module('app.ui')
        .component('wRadioWrap', {
            bindings: {
                value: '=ngModel'
            },
            transclude: true,
            template: '<div ng-transclude class="btn-wrap btn-group"></div>',
            controller
        });
})();
