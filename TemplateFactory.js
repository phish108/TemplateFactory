/* jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

/**
 * ## Template Factory
 *
 * Factory Class for creating HTML template objects that can be reused in views.
 *
 * The idea of the TmplFactory is that you want to have as little HTML code generation
 * in your business logic as possible.
 *
 * After the factory objects are generated the templates will be removed from the DOM.
 *
 * The TmplFactory looks for template and component tags in your HTML.
 *
 * A template is a dynamic element that can be used multiple times.
 * A component is a static element that can be used once.
 *
 * Both elements enable you to abstract the HTML elements/DOM structure within
 * your business logic.
 *
 * Both elements will be removed from the flow of your document, so they won't
 * affect the style of your UI.
 *
 * The component is only present for abstracting the UI static elements using the same API
 * as for templates.
 *
 * @class TemplateFactory
 * @constructor
 * @uses ComponentBlock
 * @uses ComponentVar
 */
function TemplateFactory() {
    this.templates = {};

    var nodes = document.querySelectorAll('template, component');
    for (var i = 0; i < nodes.length; i++) {
        var id = nodes[i].getAttribute('id');
        id = id.replace(/[\s_\-]+/g, ''); // remove bad characters from the string
        if(id && id.length) {
            this.templates[id] = new ComponentBlock(nodes[i]);
        }
    }

    /**
     * ### ComponentBlock
     *
     * @class ComponentBlock
     * @for TemplateFactory
     * @uses ComponentVar
     * @constructor
     * @param {HTMLElement} tag - a template or component element
     *
     */
    function ComponentBlock(tag) {
        // var tagid = tag.id.replace(/[\s\-]+/g, ''); // remove forbidden characters for dot-notation

        this.prefixid = tag.id.replace(/[\s\-]+/g, '');
        this.bTemplate = false;
        this.currentElementId = '';

        var targetElement = null;
        this.setTargetElement = function (node) {
            if (node && node.nodeType === Node.ELEMENT_NODE)
                targetElement = node;
        };
        this.getTargetElement = function () {
            return targetElement;
        };

        this.targetid = tag.parentNode.id || '';

        if(tag.parentElement.localName.toLowerCase() === 'tbody') {
            this.targetid = tag.parentNode.parentNode.id || '';
        }

        if (this.targetid && this.targetid.length){
            this.setTargetElement(tag.parentNode);
        }

        var cFrag = tag;

        var i = 0;

        if(tag.content) { // HTML5 Template capable
            cFrag = tag.content;
        }
        else {            // Polyfill for components and non template capable browsers
            cFrag = document.createDocumentFragment();
            for (i = 0; i < tag.childNodes.length; i) {
                cFrag.appendChild(tag.childNodes[i]);
            }
        }

        // create component variables
        this.variables = [];
        var thevars = cFrag.querySelectorAll('[id]'); // all elements that have an id in the component

        for (i = 0; i < thevars.length; i++) {
            var varid = thevars[i].id;
            this.variables.push(varid);
            this[varid] = new ComponentVar(thevars[i], this);
        }

        if (tag.nodeName.toLowerCase() === 'template') {
            this.bTemplate = true;

            if(!tag.content) {
                tag.parentNode.removeChild(tag);
            }
            this.templateCode = cFrag;
        }
        else {
            // remove the component element from the DOM flow
            // this makes components truely invisible from the layout
            tag.parentNode.replaceChild(cFrag, tag);
        }
    }

    Object.defineProperties(ComponentBlock.prototype, {
        /**
         * the identifier of the individual element. _Note_: setting may create new entries
         *
         * @property {String} id
         */
         'id' : {
             'get' : function () { return this.currentElementId; },
             'set' : function (value) {
                 // unset the active element if undefined, null, or empty strings are passed
                 if (typeof value !== 'undefined' && value !== null && value.length) {
                     if (!this.find(value)) {
                        this.attach(value);
                     }
                 }
                 else {
                     this.currentElementId = '';
                 }
             }
         },
        /**
         * The ID of the template
         *
         * @property {String} name
         * @readOnly
         */
         'name': {
             'get' : function () { return this.prefixid; }
         },
        /**
         *  the target element for inserting new entries of the template
         *
         * @property {HTMLElement} target
         */
         'target': {
             'get' :  function () {
                 return this.getTargetElement();
             },
             'set' : function (node) {
                 this.setTargetElement(node);
             }
         },
        /**
         * list of elements at the root level of the template
         *
         * @property {Array} root
         * @readOnly
         */
         'root': {
             'get' : function () {
                 var rv = [];
                 if (this.currentElementId) {
                     var t = this.target;
                     var p = this.prefix();
                     var le = t.querySelectorAll('#' + this.targetid + ' > [id $= ' + p + ']');
                     // now we have all elements
                     for (var i = 0; i < le.length; i++) {
                        rv.push(le[i]);
                     }
                 }
                 return rv;
             }
         }
    });

    /**
     * @method prefix
     * @returns {String} - prefix id that for uniquely identifying the generated elements
     */
    ComponentBlock.prototype.prefix = function () {
        if (this.bTemplate) {
            return  '_' + this.prefixid + '_' + this.currentElementId;
        }
        return '';
    };

    /**
     * Create and insert a new carbon copy of the template to the target element
     *
     * @method attach
     * @param {String} objectid - the (non-prefixed) id of the newly gerenated template object
     */
    ComponentBlock.prototype.attach = function (objectid) {
        if (this.bTemplate) {
            this.appendTo(document.getElementById(this.targetid), objectid);
        }
    };

    /**
     * Remove forbidden characters from the objectid
     *
     * @method flattenObjectId
     * @private
     * @param {String} objectid - the (non-prefixed) id of the newly gerenated template object
     */
    function flattenObjectId(objectid) {
        // forbidden css selectors
        // !, ", #, $, %, &, ', (, ), *, +, ,, -, ., /, :, ;, <, =, >, ?, @, [, \, ], ^, `, {, |, }, and ~.
        objectid = objectid.replace(/[\!\"\'\#\$\^\<\>\=\?\*\.\/\\\]\[\{\}\`\~\%\&\-\(\)\+\s\,\:\;\@\|]+/g, '');
        return objectid;
    }

    /**
     * @method appendTo
     * @param {HTMLElement} node - the target element (parent) for inserting the newly generated template object
     * @param {String} objectid - the (non-prefixed) id of the newly gerenated template object
     */
    ComponentBlock.prototype.appendTo = function (node, objectid) {
        if (this.bTemplate && node && node.nodeType === Node.ELEMENT_NODE) {
            var df = this.templateCode.cloneNode(true);

            this.currentElementId = flattenObjectId(objectid) || '';
            this.calculateObjectID();

            this.initRootElements(df);
            this.initVariables(df);

            node.appendChild(df);
            this._targetElement = node;
        }
    };

    /**
     * compute a definitely unique object id for new elements
     *
     * @method calculateObjectID
     */
    ComponentBlock.prototype.calculateObjectID = function () {
        var cI = this.currentElementId || '';
        if (!cI.length || this.find(cI)) {
            var i = 0;
            for (i; this.find(cI + i); i++);
            this.currentElementId = cI + i;
        }
    };

    /**
     * Process the template's root id's and replace them with their uinque counterparts.
     *
     * @method initRootElements
     * @param {HTMLDocumentFragment} frag - the template fragment
     */
    ComponentBlock.prototype.initRootElements = function (frag) {
        var j = 0;
        for (var i = 0; i < frag.childNodes.length; i++) {
            var e = frag.childNodes[i];
            if (e.nodeType === Node.ELEMENT_NODE &&
                !(e.id && e.id.length)) {
                e.id = j + this.prefix();
                j++;
            }
        }
    };


    /**
     * Process the template's element id's and replace them with their uinque counterparts.
     *
     * @method initVariables
     * @param {HTMLDocumentFragment} frag - the template fragment
     */
    ComponentBlock.prototype.initVariables = function (frag) {
        this.variables.forEach(function (e) {
            // var el = frag.getElementById(e); // fails on older webkit engines
            frag.querySelector('#' + e).id = e + this.prefix();
        }, this);
    };

    /**
     * find fragments that are based on the given template.
     *
     * @method find
     * @param {String} objectid - The (non-prefixed) id of the requested entry
     */
    ComponentBlock.prototype.find = function (objectid) {
        var le;
        if (objectid && this.variables.length) {
            var oldId = this.currentElementId;
            this.currentElementId = flattenObjectId(objectid) || '';
            le = document.querySelectorAll('[id$=' + this.prefix() + ']');

            if (!le.length) {
                this.currentElementId = oldId;
            }
        }

        return (le && le.length);
    };

    /**
     * ### ComponentVar
     *
     * Helper accessor class for manipulating the variables in ComponentBlock objects
     *
     * @class ComponentVar
     * @for ComponentBlock
     * @constructor
     * @param {HTMLElement} tag
     * @param {ComponentBlock} block
     */
    function ComponentVar(tag, cBlock) {
        this.block = cBlock;
        this.id = tag.id;

        // check for boolean selectors
        if (tag.dataset) {
            var tcls = tag.dataset.trueclass;
            var fcls = tag.dataset.falseclass;

            if ((tcls && tcls.length) || (fcls && fcls.length)) {
                this.boolClass = {
                    'true': tcls,
                    'false': fcls
                };
            }
        }

        // check for special attributes
        if ('src' in tag) {
            /**
             * manipulates the src attribute of the variable element if it is present
             *
             * @property {URLString} src
             */
            Object.defineProperty(this,
                                  'src',
                                  {
                                      get: function () {return tag.src;},
                                      set: function(value) {tag.src = value || "";}
                                  });
        }
        if ('href' in tag) {
            /**
             * manipulates the href attribute of the variable element if it is present
             *
             * @property {URLString} href
             */
            Object.defineProperty(this,
                                  'href',
                                  {
                                      get: function () {return tag.href;},
                                      set: function(value) {tag.href = value || "";}
                                  });
        }
        if ('title' in tag) {
            /**
             * manipulates the title attribute of the variable element if it is present
             *
             * @property {String} title
             */
            Object.defineProperty(this,
                                  'title',
                                  {
                                      get: function () {return tag.title;},
                                      set: function(value) {tag.title = value || "";}
                                  });
        }
        if ('alt' in tag) {
            /**
             * manipulates the alt attribute of the variable element if it is present
             *
             * @property {String} alt
             */
            Object.defineProperty(this,
                                  'alt',
                                  {
                                      get: function () {return tag.alt;},
                                      set: function(value) {tag.alt = value || "";}
                                  });
        }
    }

    Object.defineProperties(ComponentVar.prototype, {
        /**
         * manipulates the text-content and value attribute of the variable element
         *
         * @property {String} text
         */
        'text': {
            'get': function () { return this.get(); },
            'set': function (value) { this.set(value); }
        },
        /**
         * manipulates the text-content and value attribute of the variable element
         *
         * @property {String} value
         */
        'value': {
            'get': function () { return this.get(); },
            'set': function (value) { this.set(value); }
        },
        /**
         * manipulates the html-content of the variable element
         *
         * @property {HTMLString} html
         */
        'html': {
            'get': function () { return this.getHTML(); },
            'set': function (value) { this.setHTML(value); }
        },
        /**
         * trigger boolean css classes through choose() and which()
         *
         * @property {boolean} is
         */
        'is': {
            'get': function () { return this.which(); },
            'set': function (value) { this.choose(value); }
        },
        /**
         *  the HTML element of the variable element
         * @property {HTMLElement} target
         * @readOnly
         */
        'target': {
            'get': function () {
                // here is some potential for optimizing DOM processing
                return document.getElementById(this.id + this.block.prefix());
            }
        }
    });

    /**
     * manipulates the text-content and value attribute of the variable element
     *
     * @method set
     * @param {String} data
     */
    ComponentVar.prototype.set = function (data) {
        this.target.textContent = data;
        //console.log(typeof this.target.value);
        //FIXME - test if value key exists
        //if (this.target.value) {
            this.target.value = data;
        //}
    };

    /**
     * @method setHTML
     * @param {HTMLString} data
     */
    ComponentVar.prototype.setHTML = function (data) {
        this.target.innerHTML = data;
    };

    /**
     * Remove all data from the text-content and/or the value attribute
     *
     * @method clear
     */
    ComponentVar.prototype.clear = function () {
        this.target.textContent = '';
        if (this.target.value) {
            this.target.value = '';
        }
    };

    /**
     * Accessor for the text-content or value attribute. If the value attribute is present it is always selected
     *
     * @method get
     * @return {String} - the text content of the variable element
     */
    ComponentVar.prototype.get = function () {
        return this.target.value ? this.target.value : this.target.textContent;
    };

    /**
     * Accessor for the HTML content of the variable element
     *
     * @method getHTML
     * @return {HTMLString} - the HTML Content
     */
    ComponentVar.prototype.getHTML = function () {
        return this.target.innerHTML;
    };

    /**
     * Set the css class of the variable element. multiple classes can get set if they are separated by spaces or
     * if they get passed as an Array.
     *
     * @method setClass
     * @param {String} classname
     */
    ComponentVar.prototype.setClass = function (classname) {
        var clst;
        var t = this.target;
        if (typeof classname === 'string') {
            clst = classname.split(' ');
        }
        if (Array.isArray(classname)) {
            clst = classname;
        }
        for (var i in clst) {
            t.classList.add(clst[i]);
        }
    };

    /**
     * Alias for setClass()
     *
     * @method addClass
     * @param {Mixed} classname
     */
    ComponentVar.prototype.addClass = ComponentVar.prototype.setClass;

    /**
     * Remove one or more classnames from the target element
     * multiple classnames can get removed in one go if they get pass in a
     * whitespace separated string or as an Array
     *
     * @method removeClass
     * @param {Mixed} classname
     */
    ComponentVar.prototype.removeClass = function (classname) {
        var clst;
        var t = this.target;
        if (typeof classname === 'string') {
            clst = classname.split(' ');
        }
        if (Array.isArray(classname)) {
            clst = classname;
        }
        for (var i in clst) {
            t.classList.remove(clst[i]);
        }
    };

    /**
     * Remove all CSS classes from the variable element
     *
     * @method clearClass
     */
    ComponentVar.prototype.clearClass = function () {
        // brute force removal of all classes
        this.target.className = '';
    };

    /**
     * hasClass() checks whether one or more classes are set of the target element.
     * hasClass() returns true if ALL provided classnames are set.
     * Given that the current target has only the 'foo' and the 'bar' classes set
     * then hasClass('foo bar') will return true, but hasClass('foo bar baz') returns false.
     * Testing for each class independently, will return true for each class set.
     *
     * @method hasClass
     * @param {Mixed} classname
     */
    ComponentVar.prototype.hasClass = function (classname) {
        var clst;
        var t = this.target;
        if (typeof classname === 'string') {
            clst = classname.split(' ');
        }
        if (Array.isArray(classname)) {
            clst = classname;
        }
        for (var i in clst) {
            if (!t.classList.contains(clst[i])) {
                return false;
            }
        }
        return true;
    };

    /**
     * toggleClass() toggles one or more classes. Note that each class is toggled independently.
     * Given that the target element has class 'foo' already set the call toggleClass('foo bar')
     * will remove 'foo' and add 'bar'.
     *
     * @method toggleClass
     * @param {Mixed} classname
     */
    ComponentVar.prototype.toggleClass = function (classname) {
        var clst;
        var t = this.target;
        if (typeof classname === 'string') {
            clst = classname.split(' ');
        }
        if (Array.isArray(classname)) {
            clst = classname;
        }
        for (var i in clst) {
            t.classList.toggle(clst[i]);
        }
    };

    /**
     * @method setAttribute
     * @param {String} attributename
     * @param {String} attributevalue
     */
    ComponentVar.prototype.setAttribute = function (attrname, attrvalue) {
        this.target.setAttribute(attrname, attrvalue);
    };

    /**
     * @method clearAttribute
     * @param {String} attributeName
     */
    ComponentVar.prototype.clearAttribute = function (attrname) {
        this.target.removeAttribute(attrname);
    };

    /**
     * Alias for clearAttribute()
     *
     * @method removeAttribute
     * @param {String} attributeName
     */
    ComponentVar.prototype.removeAttribute = ComponentVar.prototype.clearAttribute;

    /**
     * @method getAttribute
     * @param {String} atttributeName
     */
    ComponentVar.prototype.getAttribute = function (attrname) {
        return this.target.getAttribute(attrname);
    };

    /**
     * Choose between "data-trueclass" and "data-falseclass" CSS definitions. True values will
     * activate the trueclass in the variable element. False values will activate the falseclass.
     *
     * @method choose
     * @param {Boolean} bValue
     */
    ComponentVar.prototype.choose = function (bValue) {
        if (this.boolClass) {
            var add = bValue ? 'true' : 'false';
            var rem = bValue ? 'false' : 'true';

            if (this.boolClass[rem] && this.boolClass[rem].length) {
                // we can always remove
                this.removeClass(this.boolClass[rem]);
            }
            if (this.boolClass[add] && this.boolClass[add].length) {
                // we should only add if the class is not yet added
                this.addClass(this.boolClass[add]);
            }
        }
    };

    /**
     * @method which
     * @return {Boolean} - true if trueclass is set and false if falseclass is set.
     */
    ComponentVar.prototype.which = function () {
        return (this.boolClass && (this.hasClass(this.boolClass.true) || !this.hasClass(this.boolClass.false)));
    };
}

/**
 * returns a template class or undefined
 *
 * @method getTemplate
 * @param {String} name - name of the template as given in its id.
 * @return {ComponentBlock} - the template component with the specified name as ID
 */
TemplateFactory.prototype.getTemplate = function (name) {
    return this.templates[name];
};

/**
 * returns all templates that are associated with a targetid.
 *
 * @method getTargetTemplate
 * @param @string targetid
 * @return {Mixed} - template or template array that are defined under the element with the given id.
 */
TemplateFactory.prototype.getTargetTemplate = function (targetid) {
    var result = {};
    var k;
    for (k in this.templates) {
        if (this.templates[k].targetid === targetid) {
            result[k] = this.templates[k];
        }
    }

    k = Object.keys(result);
    return k.length > 1 ? result :  k.length > 0 ? result[k[0]] : undefined;
};
