# Overview
What's a nudge? It's a way to prompt, alert or inform a user. Nudges can fetch data (e.g. JSON) from a specified endpoint, and provides hook to parse this data.
Nudges can perform callback functions for true/false outcomes, and are stored in a global array (window.Nudges) for reference.
Nudges may contain forms, which are validated via HTML5 constraint validation.
Lastly, nudges can be chained.


# Dependencies
None.


# Browser support
Works on IE9, but note that IE9 does not support the `checkValidity()` method. As such, forms won't work on IE9 unless a polyfill is loaded. I'm also aware that Safari returns **dreadful** error messages. Needs better testing across browsers.


# Usage
Include nudge.js and (optionally) nudge.css.


## Simple alert
The most simple nudge may be created as such:

```javascript
<script>
    var anchor = document.getElementById('some-id');
    var alertUser = function () {
        new Nudge({
            title: '<h2>Alert test</h2>',
            content: '<p>Just a simple alert</p>'
        });
    }

    anchor.addEventListener('click', function () {
        alertUser();
    });
<script>
```


## Boolean conditions
The snippet below produces a nudge with a true/false condition, with a confirmation screen onConfirm.

```javascript
<script>
    var anchor = document.getElementById('some-id');

    var informUser = function () {
        new Nudge({
            title: '<h2>Item deleted</h2>',
            content: '<p>The item was successfully deleted!</p>'
        });
    }

    var askUser = function () {
        new Nudge({
            boolean: true,
            destructive: true,
            title: '<h2>Delete item</h2>',
            content: '<p>Are you sure you want to delete this item?</p>',
            onConfirm: function () {
                console.log('Do whatever is needed to delete the thing...');
                informUser();
            },
            onCancel: function () {
                console.log('Do nothing');
            }
        });
    }

    anchor.addEventListener('click', function () {
        askUser();
    });
<script>
```


## AJAX content
Nudges can fetch content from a given endpoint, like so:

```javascript
<script>
    new Nudge({
        boolean: true,
        destructive: true,
        title: '<h2>Delete item</h2>',
        data: '/endpoint-for-json-or-html-or-something',
        parsingHooks: function (data) {
            // transform the data in some way
            return data;
        }
    });
</script>
```


## API
TODO
