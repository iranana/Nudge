/*jshint browser: true*/

;(function () {
    "use strict";

    /*
    @param {boolean}    boolean - Determines whether the nudge should have a boolean condition (i.e. ok/cancel).
    @param {string}     title - HTML for title.
    @param {string}     content - HTML for the content/body of a nudge.
    @param {string}     data - An endpoint that returns HTML or JSON.
    @param {function}   parsingHooks - A function to parse data, if applicable. Should return HTML.
    @param {function}   onCancel - This function is called when the user clicks 'cancel'.
    @param {function}   onConfirm - This function is called when the user clicks 'confirm'.
    @param {Array}      buttonText - Array of two strings to be used as button text.
    @param {Object}     form - Container object for a form. Requires 'fields'.
    @param {Array}      form.fields - Array of objects. E.g. { label: '<label></label>', input: '<input type="text" required" />' }
    */
    function Nudge(settings) {
        this.id = settings.id || this.guid();

        // Settings
        this.boolean = settings.boolean || false;
        this.destructive = settings.destructive || false;
        this.title = settings.title || null;
        this.content = settings.content || null;
        this.data = settings.data || null;
        this.parsingHooks = settings.parsingHooks || null;
        this.onCancel = settings.onCancel || null;
        this.onConfirm = settings.onConfirm || null;
        this.buttonText = settings.buttonText || ['Ok', 'Cancel'];
        this.form = settings.form || null;
        if (this.form) {
            this.form.dom = [];
            this.form.elements = [];
            this.form.invalids = [];
            this.form.answers = [];
        }
        this.renderHooks = settings.renderHooks || null;

        // DOM
        this.container = document.createElement('div');
        this.container.className = 'nudge-container';

        this.inner = document.createElement('div');
        this.inner.className = 'nudge-inner';
        this.inner.id = this.id;

        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'nudge-content';

        this.navContainer = document.createElement('nav');
        this.navContainer.className = 'nudge-nav';

        this.confirmButton = document.createElement('a');
        this.confirmButton.className = 'confirm button';
        this.confirmButton.textContent = this.buttonText[0];

        if (this.destructive) {
            this.confirmButton.className += ' red';
        } else {
            this.confirmButton.className += ' green';
        }

        this.cancelButton = document.createElement('a');
        this.cancelButton.className = 'cancel button';
        this.cancelButton.textContent = this.buttonText[1];

        this.pastLife = Nudge.seek(this.id) || null;

        if (this.data) {
            this.getContent();
        } else {
            this.render();
        }

        this.bindHandlers();
    }



    /*
    Generate a unique id
    */
    Nudge.prototype.guid = function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    };


    /*
    Fetch content from a given endpoint.
    */
    Nudge.prototype.getContent = function () {
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if ((xhr.readyState === XMLHttpRequest.DONE) && ((xhr.status === 200) || (xhr.status === 201))) {
                this.render(xhr.responseText);
            }
            if ((xhr.readyState === XMLHttpRequest.DONE) && ((xhr.status === 500) || (xhr.status === 502))) {
                console.warn(xhr.responseText);
            }
        }.bind(this);

        xhr.open('GET', this.data, true);
        xhr.send();
    };


    /*
    Assign handlers.
    */
    Nudge.prototype.bindHandlers = function () {
        if (!this.boolean) {
            this.container.addEventListener('click', this.remove.bind(this));
        }

        this.inner.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        this.confirmButton.addEventListener('click', function () {
            Nudge.destroy(this.id);
            window.Nudges.push(this);

            if (this.form) {
                this.validateForm();

                if (this.form.invalids.length > 0) {
                    return false;
                }

                this.stashFormElements();
            }
            if (this.onConfirm) {
                this.onConfirm(this);
            }
            this.remove();
        }.bind(this));

        this.cancelButton.addEventListener('click', function () {
            if (this.onCancel) {
                this.onCancel(this);
            }
            this.remove();
        }.bind(this));
    };


    /*
    Render the nudge.
    */
    Nudge.prototype.render = function (data) {
        Nudge.destroy(this.id);
        window.Nudges.push(this);

        if (this.title) {
            this.inner.insertAdjacentHTML('afterbegin', this.title);
        }

        if (data) {
            if (this.parsingHooks) {
                data = this.parsingHooks(data);
            }
            this.contentContainer.innerHTML = data;
        } else if (this.content) {
            this.contentContainer.innerHTML = this.content;
        }

        if (this.form) {
            var form, list;

            // If this nudge had a past life, get its form DOM
            // Otherwise, build up form from this.form.fields
            if (this.pastLife) {
                form = this.pastLife.form.dom;
                this.form.answers = this.pastLife.form.answers;
            } else {
                form = document.createElement('form');
                list = document.createElement('ol');
                for (var i = 0; i < this.form.fields.length; i++) {
                    var item = document.createElement('li');
                    item.innerHTML = this.form.fields[i].label + this.form.fields[i].input;
                    list.appendChild(item);
                }
                form.appendChild(list);
            }
            this.form.dom = form;
            this.contentContainer.appendChild(form);
            this.stashFormElements();
        }

        if (this.renderHooks) {
            this.renderHooks(this);
        }

        this.inner.appendChild(this.contentContainer);
        if (this.boolean) {
            this.navContainer.appendChild(this.cancelButton);
        }
        this.navContainer.appendChild(this.confirmButton);
        this.inner.appendChild(this.navContainer);
        this.container.appendChild(this.inner);
        document.body.appendChild(this.container);
    };


    /*
    Stash elements
    */
    Nudge.prototype.stashFormElements = function () {
        this.form.elements = [];
        var elements = Array.prototype.slice.call(this.contentContainer.querySelectorAll('input, textarea, select'));
        for (var i = 0; i < elements.length; i++) {
            this.form.elements.push(elements[i]);
        }
    };


    /*
    Push an answer to the form.answers array.
    Special cases for radio, checkbox and select[multiple]
    */
    Nudge.prototype.pushAnswer = function (input) {
        var label = document.querySelector('label[for="' + input.name + '"]');

        if ((input.type === 'radio') || (input.type === 'checkbox')) {
            if (input.checked) {
                this.form.answers.push({ id: input.id, value: input.value, label: label });
            }
        } else if (input.type === 'select-multiple') {
            var options = input.querySelectorAll('option');
            var values = [];
            for (var i = 0; i < options.length; i++) {
                if (options[i].selected) {
                    values.push(options[i].value);
                }
            }
            this.form.answers.push({ id: input.id, value: values, label: label });
        } else {
            this.form.answers.push({ id: input.id, value: input.value, label: label });
        }
    };


    /*
    Validate an input
    See https://github.com/iranana/Constraints for better validation on Safari
    */
    Nudge.prototype.validateInput = function (input) {
        var message = this.form.dom.querySelector('.validation-message[data-for="' + input.id + '"][data-name="' + input.name + '"]');
        var relatedMessages = this.form.dom.querySelectorAll('.validation-message[data-name="' + input.name + '"]');

        if (input.checkValidity() === false) {
            if (!message && (relatedMessages.length <= 0)) {
                message = document.createElement('p');
                message.className += 'validation-message';
                message.setAttribute('data-for', input.id);
                message.setAttribute('data-name', input.name);
                message.textContent = input.validationMessage;
                input.parentNode.appendChild(message);
            }
            if (message) {
                message.textContent = input.validationMessage;
            }
            var exists = this.form.invalids.indexOf(input);
            if (exists === -1) {
                this.form.invalids.push(input);
            }
        } else {
            var toRemove = this.form.invalids.indexOf(input);
            if (toRemove > -1) {
                this.form.invalids.splice(toRemove, 1);
            }
            if (message) {
                message.parentNode.removeChild(message);
            }
            this.pushAnswer(input);
        }
    };


    /*
    Validate a form.
    */
    Nudge.prototype.validateForm = function () {
        this.form.answers = [];
        for (var i = 0; i < this.form.elements.length; i++) {
            this.validateInput(this.form.elements[i]);
        }
    };


    /*
    Remove from dom.
    */
    Nudge.prototype.remove = function () {
        this.container.className += ' leaving';
        setTimeout(function () {
            this.container.parentNode.removeChild(this.container);
        }.bind(this), 300);
    };


    /*
    Find a given nudge
    */
    Nudge.seek = function (id) {
        for (var i = 0; i < window.Nudges.length; i++) {
            if (window.Nudges[i].id === id) {
                return window.Nudges[i];
            }
        }
    };


    /*
    Remove nudge from window.Nudges
    */
    Nudge.destroy = function (id) {
        var obj = Nudge.seek(id);
        if (obj) {
            var index = window.Nudges.indexOf(obj);
            window.Nudges.splice(index, 1);
        }
    };


    /*
    Get answers for a nudge
    */
    Nudge.getAnswers = function (id) {
        var obj = Nudge.seek(id);
        if (obj.form) {
            return obj.form.answers;
        }
    };


    /*
    Global array of Nudges.
    */
    window.Nudges = [];


    /*
    Expose function
    */
    window.Nudge = Nudge;
})();
