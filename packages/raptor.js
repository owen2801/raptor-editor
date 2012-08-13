/*! 
VERSION: 0.0.15 
For license information, see http://www.raptor-editor.com/license
*/
/**
 * @license Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Copyright 2012, Tim Down
 * Licensed under the MIT license.
 * Version: 1.2.3
 * Build date: 26 February 2012
 */
window['rangy'] = (function() {


    var OBJECT = "object", FUNCTION = "function", UNDEFINED = "undefined";

    var domRangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed",
        "commonAncestorContainer", "START_TO_START", "START_TO_END", "END_TO_START", "END_TO_END"];

    var domRangeMethods = ["setStart", "setStartBefore", "setStartAfter", "setEnd", "setEndBefore",
        "setEndAfter", "collapse", "selectNode", "selectNodeContents", "compareBoundaryPoints", "deleteContents",
        "extractContents", "cloneContents", "insertNode", "surroundContents", "cloneRange", "toString", "detach"];

    var textRangeProperties = ["boundingHeight", "boundingLeft", "boundingTop", "boundingWidth", "htmlText", "text"];

    // Subset of TextRange's full set of methods that we're interested in
    var textRangeMethods = ["collapse", "compareEndPoints", "duplicate", "getBookmark", "moveToBookmark",
        "moveToElementText", "parentElement", "pasteHTML", "select", "setEndPoint", "getBoundingClientRect"];

    /*----------------------------------------------------------------------------------------------------------------*/

    // Trio of functions taken from Peter Michaux's article:
    // http://peter.michaux.ca/articles/feature-detection-state-of-the-art-browser-scripting
    function isHostMethod(o, p) {
        var t = typeof o[p];
        return t == FUNCTION || (!!(t == OBJECT && o[p])) || t == "unknown";
    }

    function isHostObject(o, p) {
        return !!(typeof o[p] == OBJECT && o[p]);
    }

    function isHostProperty(o, p) {
        return typeof o[p] != UNDEFINED;
    }

    // Creates a convenience function to save verbose repeated calls to tests functions
    function createMultiplePropertyTest(testFunc) {
        return function(o, props) {
            var i = props.length;
            while (i--) {
                if (!testFunc(o, props[i])) {
                    return false;
                }
            }
            return true;
        };
    }

    // Next trio of functions are a convenience to save verbose repeated calls to previous two functions
    var areHostMethods = createMultiplePropertyTest(isHostMethod);
    var areHostObjects = createMultiplePropertyTest(isHostObject);
    var areHostProperties = createMultiplePropertyTest(isHostProperty);

    function isTextRange(range) {
        return range && areHostMethods(range, textRangeMethods) && areHostProperties(range, textRangeProperties);
    }

    var api = {
        version: "1.2.3",
        initialized: false,
        supported: true,

        util: {
            isHostMethod: isHostMethod,
            isHostObject: isHostObject,
            isHostProperty: isHostProperty,
            areHostMethods: areHostMethods,
            areHostObjects: areHostObjects,
            areHostProperties: areHostProperties,
            isTextRange: isTextRange
        },

        features: {},

        modules: {},
        config: {
            alertOnWarn: false,
            preferTextRange: false
        }
    };

    function fail(reason) {
        window.alert("Rangy not supported in your browser. Reason: " + reason);
        api.initialized = true;
        api.supported = false;
    }

    api.fail = fail;

    function warn(msg) {
        var warningMessage = "Rangy warning: " + msg;
        if (api.config.alertOnWarn) {
            window.alert(warningMessage);
        } else if (typeof window.console != UNDEFINED && typeof window.console.log != UNDEFINED) {
            window.console.log(warningMessage);
        }
    }

    api.warn = warn;

    if ({}.hasOwnProperty) {
        api.util.extend = function(o, props) {
            for (var i in props) {
                if (props.hasOwnProperty(i)) {
                    o[i] = props[i];
                }
            }
        };
    } else {
        fail("hasOwnProperty not supported");
    }

    var initListeners = [];
    var moduleInitializers = [];

    // Initialization
    function init() {
        if (api.initialized) {
            return;
        }
        var testRange;
        var implementsDomRange = false, implementsTextRange = false;

        // First, perform basic feature tests

        if (isHostMethod(document, "createRange")) {
            testRange = document.createRange();
            if (areHostMethods(testRange, domRangeMethods) && areHostProperties(testRange, domRangeProperties)) {
                implementsDomRange = true;
            }
            testRange.detach();
        }

        var body = isHostObject(document, "body") ? document.body : document.getElementsByTagName("body")[0];

        if (body && isHostMethod(body, "createTextRange")) {
            testRange = body.createTextRange();
            if (isTextRange(testRange)) {
                implementsTextRange = true;
            }
        }

        if (!implementsDomRange && !implementsTextRange) {
            fail("Neither Range nor TextRange are implemented");
        }

        api.initialized = true;
        api.features = {
            implementsDomRange: implementsDomRange,
            implementsTextRange: implementsTextRange
        };

        // Initialize modules and call init listeners
        var allListeners = moduleInitializers.concat(initListeners);
        for (var i = 0, len = allListeners.length; i < len; ++i) {
            try {
                allListeners[i](api);
            } catch (ex) {
                if (isHostObject(window, "console") && isHostMethod(window.console, "log")) {
                    window.console.log("Init listener threw an exception. Continuing.", ex);
                }

            }
        }
    }

    // Allow external scripts to initialize this library in case it's loaded after the document has loaded
    api.init = init;

    // Execute listener immediately if already initialized
    api.addInitListener = function(listener) {
        if (api.initialized) {
            listener(api);
        } else {
            initListeners.push(listener);
        }
    };

    var createMissingNativeApiListeners = [];

    api.addCreateMissingNativeApiListener = function(listener) {
        createMissingNativeApiListeners.push(listener);
    };

    function createMissingNativeApi(win) {
        win = win || window;
        init();

        // Notify listeners
        for (var i = 0, len = createMissingNativeApiListeners.length; i < len; ++i) {
            createMissingNativeApiListeners[i](win);
        }
    }

    api.createMissingNativeApi = createMissingNativeApi;

    /**
     * @constructor
     */
    function Module(name) {
        this.name = name;
        this.initialized = false;
        this.supported = false;
    }

    Module.prototype.fail = function(reason) {
        this.initialized = true;
        this.supported = false;

        throw new Error("Module '" + this.name + "' failed to load: " + reason);
    };

    Module.prototype.warn = function(msg) {
        api.warn("Module " + this.name + ": " + msg);
    };

    Module.prototype.createError = function(msg) {
        return new Error("Error in Rangy " + this.name + " module: " + msg);
    };

    api.createModule = function(name, initFunc) {
        var module = new Module(name);
        api.modules[name] = module;

        moduleInitializers.push(function(api) {
            initFunc(api, module);
            module.initialized = true;
            module.supported = true;
        });
    };

    api.requireModules = function(modules) {
        for (var i = 0, len = modules.length, module, moduleName; i < len; ++i) {
            moduleName = modules[i];
            module = api.modules[moduleName];
            if (!module || !(module instanceof Module)) {
                throw new Error("Module '" + moduleName + "' not found");
            }
            if (!module.supported) {
                throw new Error("Module '" + moduleName + "' not supported");
            }
        }
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    // Wait for document to load before running tests

    var docReady = false;

    var loadHandler = function(e) {

        if (!docReady) {
            docReady = true;
            if (!api.initialized) {
                init();
            }
        }
    };

    // Test whether we have window and document objects that we will need
    if (typeof window == UNDEFINED) {
        fail("No window found");
        return;
    }
    if (typeof document == UNDEFINED) {
        fail("No document found");
        return;
    }

    if (isHostMethod(document, "addEventListener")) {
        document.addEventListener("DOMContentLoaded", loadHandler, false);
    }

    // Add a fallback in case the DOMContentLoaded event isn't supported
    if (isHostMethod(window, "addEventListener")) {
        window.addEventListener("load", loadHandler, false);
    } else if (isHostMethod(window, "attachEvent")) {
        window.attachEvent("onload", loadHandler);
    } else {
        fail("Window does not have required addEventListener or attachEvent method");
    }

    return api;
})();
rangy.createModule("DomUtil", function(api, module) {

    var UNDEF = "undefined";
    var util = api.util;

    // Perform feature tests
    if (!util.areHostMethods(document, ["createDocumentFragment", "createElement", "createTextNode"])) {
        module.fail("document missing a Node creation method");
    }

    if (!util.isHostMethod(document, "getElementsByTagName")) {
        module.fail("document missing getElementsByTagName method");
    }

    var el = document.createElement("div");
    if (!util.areHostMethods(el, ["insertBefore", "appendChild", "cloneNode"] ||
            !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]))) {
        module.fail("Incomplete Element implementation");
    }

    // innerHTML is required for Range's createContextualFragment method
    if (!util.isHostProperty(el, "innerHTML")) {
        module.fail("Element is missing innerHTML property");
    }

    var textNode = document.createTextNode("test");
    if (!util.areHostMethods(textNode, ["splitText", "deleteData", "insertData", "appendData", "cloneNode"] ||
            !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]) ||
            !util.areHostProperties(textNode, ["data"]))) {
        module.fail("Incomplete Text Node implementation");
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Removed use of indexOf because of a bizarre bug in Opera that is thrown in one of the Acid3 tests. I haven't been
    // able to replicate it outside of the test. The bug is that indexOf returns -1 when called on an Array that
    // contains just the document as a single element and the value searched for is the document.
    var arrayContains = /*Array.prototype.indexOf ?
        function(arr, val) {
            return arr.indexOf(val) > -1;
        }:*/

        function(arr, val) {
            var i = arr.length;
            while (i--) {
                if (arr[i] === val) {
                    return true;
                }
            }
            return false;
        };

    // Opera 11 puts HTML elements in the null namespace, it seems, and IE 7 has undefined namespaceURI
    function isHtmlNamespace(node) {
        var ns;
        return typeof node.namespaceURI == UNDEF || ((ns = node.namespaceURI) === null || ns == "http://www.w3.org/1999/xhtml");
    }

    function parentElement(node) {
        var parent = node.parentNode;
        return (parent.nodeType == 1) ? parent : null;
    }

    function getNodeIndex(node) {
        var i = 0;
        while( (node = node.previousSibling) ) {
            i++;
        }
        return i;
    }

    function getNodeLength(node) {
        var childNodes;
        return isCharacterDataNode(node) ? node.length : ((childNodes = node.childNodes) ? childNodes.length : 0);
    }

    function getCommonAncestor(node1, node2) {
        var ancestors = [], n;
        for (n = node1; n; n = n.parentNode) {
            ancestors.push(n);
        }

        for (n = node2; n; n = n.parentNode) {
            if (arrayContains(ancestors, n)) {
                return n;
            }
        }

        return null;
    }

    function isAncestorOf(ancestor, descendant, selfIsAncestor) {
        var n = selfIsAncestor ? descendant : descendant.parentNode;
        while (n) {
            if (n === ancestor) {
                return true;
            } else {
                n = n.parentNode;
            }
        }
        return false;
    }

    function getClosestAncestorIn(node, ancestor, selfIsAncestor) {
        var p, n = selfIsAncestor ? node : node.parentNode;
        while (n) {
            p = n.parentNode;
            if (p === ancestor) {
                return n;
            }
            n = p;
        }
        return null;
    }

    function isCharacterDataNode(node) {
        var t = node.nodeType;
        return t == 3 || t == 4 || t == 8 ; // Text, CDataSection or Comment
    }

    function insertAfter(node, precedingNode) {
        var nextNode = precedingNode.nextSibling, parent = precedingNode.parentNode;
        if (nextNode) {
            parent.insertBefore(node, nextNode);
        } else {
            parent.appendChild(node);
        }
        return node;
    }

    // Note that we cannot use splitText() because it is bugridden in IE 9.
    function splitDataNode(node, index) {
        var newNode = node.cloneNode(false);
        newNode.deleteData(0, index);
        node.deleteData(index, node.length - index);
        insertAfter(newNode, node);
        return newNode;
    }

    function getDocument(node) {
        if (node.nodeType == 9) {
            return node;
        } else if (typeof node.ownerDocument != UNDEF) {
            return node.ownerDocument;
        } else if (typeof node.document != UNDEF) {
            return node.document;
        } else if (node.parentNode) {
            return getDocument(node.parentNode);
        } else {
            throw new Error("getDocument: no document found for node");
        }
    }

    function getWindow(node) {
        var doc = getDocument(node);
        if (typeof doc.defaultView != UNDEF) {
            return doc.defaultView;
        } else if (typeof doc.parentWindow != UNDEF) {
            return doc.parentWindow;
        } else {
            throw new Error("Cannot get a window object for node");
        }
    }

    function getIframeDocument(iframeEl) {
        if (typeof iframeEl.contentDocument != UNDEF) {
            return iframeEl.contentDocument;
        } else if (typeof iframeEl.contentWindow != UNDEF) {
            return iframeEl.contentWindow.document;
        } else {
            throw new Error("getIframeWindow: No Document object found for iframe element");
        }
    }

    function getIframeWindow(iframeEl) {
        if (typeof iframeEl.contentWindow != UNDEF) {
            return iframeEl.contentWindow;
        } else if (typeof iframeEl.contentDocument != UNDEF) {
            return iframeEl.contentDocument.defaultView;
        } else {
            throw new Error("getIframeWindow: No Window object found for iframe element");
        }
    }

    function getBody(doc) {
        return util.isHostObject(doc, "body") ? doc.body : doc.getElementsByTagName("body")[0];
    }

    function getRootContainer(node) {
        var parent;
        while ( (parent = node.parentNode) ) {
            node = parent;
        }
        return node;
    }

    function comparePoints(nodeA, offsetA, nodeB, offsetB) {
        // See http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html#Level-2-Range-Comparing
        var nodeC, root, childA, childB, n;
        if (nodeA == nodeB) {

            // Case 1: nodes are the same
            return offsetA === offsetB ? 0 : (offsetA < offsetB) ? -1 : 1;
        } else if ( (nodeC = getClosestAncestorIn(nodeB, nodeA, true)) ) {

            // Case 2: node C (container B or an ancestor) is a child node of A
            return offsetA <= getNodeIndex(nodeC) ? -1 : 1;
        } else if ( (nodeC = getClosestAncestorIn(nodeA, nodeB, true)) ) {

            // Case 3: node C (container A or an ancestor) is a child node of B
            return getNodeIndex(nodeC) < offsetB  ? -1 : 1;
        } else {

            // Case 4: containers are siblings or descendants of siblings
            root = getCommonAncestor(nodeA, nodeB);
            childA = (nodeA === root) ? root : getClosestAncestorIn(nodeA, root, true);
            childB = (nodeB === root) ? root : getClosestAncestorIn(nodeB, root, true);

            if (childA === childB) {
                // This shouldn't be possible

                throw new Error("comparePoints got to case 4 and childA and childB are the same!");
            } else {
                n = root.firstChild;
                while (n) {
                    if (n === childA) {
                        return -1;
                    } else if (n === childB) {
                        return 1;
                    }
                    n = n.nextSibling;
                }
                throw new Error("Should not be here!");
            }
        }
    }

    function fragmentFromNodeChildren(node) {
        var fragment = getDocument(node).createDocumentFragment(), child;
        while ( (child = node.firstChild) ) {
            fragment.appendChild(child);
        }
        return fragment;
    }

    function inspectNode(node) {
        if (!node) {
            return "[No node]";
        }
        if (isCharacterDataNode(node)) {
            return '"' + node.data + '"';
        } else if (node.nodeType == 1) {
            var idAttr = node.id ? ' id="' + node.id + '"' : "";
            return "<" + node.nodeName + idAttr + ">[" + node.childNodes.length + "]";
        } else {
            return node.nodeName;
        }
    }

    /**
     * @constructor
     */
    function NodeIterator(root) {
        this.root = root;
        this._next = root;
    }

    NodeIterator.prototype = {
        _current: null,

        hasNext: function() {
            return !!this._next;
        },

        next: function() {
            var n = this._current = this._next;
            var child, next;
            if (this._current) {
                child = n.firstChild;
                if (child) {
                    this._next = child;
                } else {
                    next = null;
                    while ((n !== this.root) && !(next = n.nextSibling)) {
                        n = n.parentNode;
                    }
                    this._next = next;
                }
            }
            return this._current;
        },

        detach: function() {
            this._current = this._next = this.root = null;
        }
    };

    function createIterator(root) {
        return new NodeIterator(root);
    }

    /**
     * @constructor
     */
    function DomPosition(node, offset) {
        this.node = node;
        this.offset = offset;
    }

    DomPosition.prototype = {
        equals: function(pos) {
            return this.node === pos.node & this.offset == pos.offset;
        },

        inspect: function() {
            return "[DomPosition(" + inspectNode(this.node) + ":" + this.offset + ")]";
        }
    };

    /**
     * @constructor
     */
    function DOMException(codeName) {
        this.code = this[codeName];
        this.codeName = codeName;
        this.message = "DOMException: " + this.codeName;
    }

    DOMException.prototype = {
        INDEX_SIZE_ERR: 1,
        HIERARCHY_REQUEST_ERR: 3,
        WRONG_DOCUMENT_ERR: 4,
        NO_MODIFICATION_ALLOWED_ERR: 7,
        NOT_FOUND_ERR: 8,
        NOT_SUPPORTED_ERR: 9,
        INVALID_STATE_ERR: 11
    };

    DOMException.prototype.toString = function() {
        return this.message;
    };

    api.dom = {
        arrayContains: arrayContains,
        isHtmlNamespace: isHtmlNamespace,
        parentElement: parentElement,
        getNodeIndex: getNodeIndex,
        getNodeLength: getNodeLength,
        getCommonAncestor: getCommonAncestor,
        isAncestorOf: isAncestorOf,
        getClosestAncestorIn: getClosestAncestorIn,
        isCharacterDataNode: isCharacterDataNode,
        insertAfter: insertAfter,
        splitDataNode: splitDataNode,
        getDocument: getDocument,
        getWindow: getWindow,
        getIframeWindow: getIframeWindow,
        getIframeDocument: getIframeDocument,
        getBody: getBody,
        getRootContainer: getRootContainer,
        comparePoints: comparePoints,
        inspectNode: inspectNode,
        fragmentFromNodeChildren: fragmentFromNodeChildren,
        createIterator: createIterator,
        DomPosition: DomPosition
    };

    api.DOMException = DOMException;
});rangy.createModule("DomRange", function(api, module) {
    api.requireModules( ["DomUtil"] );


    var dom = api.dom;
    var DomPosition = dom.DomPosition;
    var DOMException = api.DOMException;

    /*----------------------------------------------------------------------------------------------------------------*/

    // Utility functions

    function isNonTextPartiallySelected(node, range) {
        return (node.nodeType != 3) &&
               (dom.isAncestorOf(node, range.startContainer, true) || dom.isAncestorOf(node, range.endContainer, true));
    }

    function getRangeDocument(range) {
        return dom.getDocument(range.startContainer);
    }

    function dispatchEvent(range, type, args) {
        var listeners = range._listeners[type];
        if (listeners) {
            for (var i = 0, len = listeners.length; i < len; ++i) {
                listeners[i].call(range, {target: range, args: args});
            }
        }
    }

    function getBoundaryBeforeNode(node) {
        return new DomPosition(node.parentNode, dom.getNodeIndex(node));
    }

    function getBoundaryAfterNode(node) {
        return new DomPosition(node.parentNode, dom.getNodeIndex(node) + 1);
    }

    function insertNodeAtPosition(node, n, o) {
        var firstNodeInserted = node.nodeType == 11 ? node.firstChild : node;
        if (dom.isCharacterDataNode(n)) {
            if (o == n.length) {
                dom.insertAfter(node, n);
            } else {
                n.parentNode.insertBefore(node, o == 0 ? n : dom.splitDataNode(n, o));
            }
        } else if (o >= n.childNodes.length) {
            n.appendChild(node);
        } else {
            n.insertBefore(node, n.childNodes[o]);
        }
        return firstNodeInserted;
    }

    function cloneSubtree(iterator) {
        var partiallySelected;
        for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator; node = iterator.next(); ) {
            partiallySelected = iterator.isPartiallySelectedSubtree();

            node = node.cloneNode(!partiallySelected);
            if (partiallySelected) {
                subIterator = iterator.getSubtreeIterator();
                node.appendChild(cloneSubtree(subIterator));
                subIterator.detach(true);
            }

            if (node.nodeType == 10) { // DocumentType
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }
            frag.appendChild(node);
        }
        return frag;
    }

    function iterateSubtree(rangeIterator, func, iteratorState) {
        var it, n;
        iteratorState = iteratorState || { stop: false };
        for (var node, subRangeIterator; node = rangeIterator.next(); ) {
            //log.debug("iterateSubtree, partially selected: " + rangeIterator.isPartiallySelectedSubtree(), nodeToString(node));
            if (rangeIterator.isPartiallySelectedSubtree()) {
                // The node is partially selected by the Range, so we can use a new RangeIterator on the portion of the
                // node selected by the Range.
                if (func(node) === false) {
                    iteratorState.stop = true;
                    return;
                } else {
                    subRangeIterator = rangeIterator.getSubtreeIterator();
                    iterateSubtree(subRangeIterator, func, iteratorState);
                    subRangeIterator.detach(true);
                    if (iteratorState.stop) {
                        return;
                    }
                }
            } else {
                // The whole node is selected, so we can use efficient DOM iteration to iterate over the node and its
                // descendant
                it = dom.createIterator(node);
                while ( (n = it.next()) ) {
                    if (func(n) === false) {
                        iteratorState.stop = true;
                        return;
                    }
                }
            }
        }
    }

    function deleteSubtree(iterator) {
        var subIterator;
        while (iterator.next()) {
            if (iterator.isPartiallySelectedSubtree()) {
                subIterator = iterator.getSubtreeIterator();
                deleteSubtree(subIterator);
                subIterator.detach(true);
            } else {
                iterator.remove();
            }
        }
    }

    function extractSubtree(iterator) {

        for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator; node = iterator.next(); ) {


            if (iterator.isPartiallySelectedSubtree()) {
                node = node.cloneNode(false);
                subIterator = iterator.getSubtreeIterator();
                node.appendChild(extractSubtree(subIterator));
                subIterator.detach(true);
            } else {
                iterator.remove();
            }
            if (node.nodeType == 10) { // DocumentType
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }
            frag.appendChild(node);
        }
        return frag;
    }

    function getNodesInRange(range, nodeTypes, filter) {
        //log.info("getNodesInRange, " + nodeTypes.join(","));
        var filterNodeTypes = !!(nodeTypes && nodeTypes.length), regex;
        var filterExists = !!filter;
        if (filterNodeTypes) {
            regex = new RegExp("^(" + nodeTypes.join("|") + ")$");
        }

        var nodes = [];
        iterateSubtree(new RangeIterator(range, false), function(node) {
            if ((!filterNodeTypes || regex.test(node.nodeType)) && (!filterExists || filter(node))) {
                nodes.push(node);
            }
        });
        return nodes;
    }

    function inspect(range) {
        var name = (typeof range.getName == "undefined") ? "Range" : range.getName();
        return "[" + name + "(" + dom.inspectNode(range.startContainer) + ":" + range.startOffset + ", " +
                dom.inspectNode(range.endContainer) + ":" + range.endOffset + ")]";
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // RangeIterator code partially borrows from IERange by Tim Ryan (http://github.com/timcameronryan/IERange)

    /**
     * @constructor
     */
    function RangeIterator(range, clonePartiallySelectedTextNodes) {
        this.range = range;
        this.clonePartiallySelectedTextNodes = clonePartiallySelectedTextNodes;



        if (!range.collapsed) {
            this.sc = range.startContainer;
            this.so = range.startOffset;
            this.ec = range.endContainer;
            this.eo = range.endOffset;
            var root = range.commonAncestorContainer;

            if (this.sc === this.ec && dom.isCharacterDataNode(this.sc)) {
                this.isSingleCharacterDataNode = true;
                this._first = this._last = this._next = this.sc;
            } else {
                this._first = this._next = (this.sc === root && !dom.isCharacterDataNode(this.sc)) ?
                    this.sc.childNodes[this.so] : dom.getClosestAncestorIn(this.sc, root, true);
                this._last = (this.ec === root && !dom.isCharacterDataNode(this.ec)) ?
                    this.ec.childNodes[this.eo - 1] : dom.getClosestAncestorIn(this.ec, root, true);
            }

        }
    }

    RangeIterator.prototype = {
        _current: null,
        _next: null,
        _first: null,
        _last: null,
        isSingleCharacterDataNode: false,

        reset: function() {
            this._current = null;
            this._next = this._first;
        },

        hasNext: function() {
            return !!this._next;
        },

        next: function() {
            // Move to next node
            var current = this._current = this._next;
            if (current) {
                this._next = (current !== this._last) ? current.nextSibling : null;

                // Check for partially selected text nodes
                if (dom.isCharacterDataNode(current) && this.clonePartiallySelectedTextNodes) {
                    if (current === this.ec) {

                        (current = current.cloneNode(true)).deleteData(this.eo, current.length - this.eo);
                    }
                    if (this._current === this.sc) {

                        (current = current.cloneNode(true)).deleteData(0, this.so);
                    }
                }
            }

            return current;
        },

        remove: function() {
            var current = this._current, start, end;

            if (dom.isCharacterDataNode(current) && (current === this.sc || current === this.ec)) {
                start = (current === this.sc) ? this.so : 0;
                end = (current === this.ec) ? this.eo : current.length;
                if (start != end) {
                    current.deleteData(start, end - start);
                }
            } else {
                if (current.parentNode) {
                    current.parentNode.removeChild(current);
                } else {

                }
            }
        },

        // Checks if the current node is partially selected
        isPartiallySelectedSubtree: function() {
            var current = this._current;
            return isNonTextPartiallySelected(current, this.range);
        },

        getSubtreeIterator: function() {
            var subRange;
            if (this.isSingleCharacterDataNode) {
                subRange = this.range.cloneRange();
                subRange.collapse();
            } else {
                subRange = new Range(getRangeDocument(this.range));
                var current = this._current;
                var startContainer = current, startOffset = 0, endContainer = current, endOffset = dom.getNodeLength(current);

                if (dom.isAncestorOf(current, this.sc, true)) {
                    startContainer = this.sc;
                    startOffset = this.so;
                }
                if (dom.isAncestorOf(current, this.ec, true)) {
                    endContainer = this.ec;
                    endOffset = this.eo;
                }

                updateBoundaries(subRange, startContainer, startOffset, endContainer, endOffset);
            }
            return new RangeIterator(subRange, this.clonePartiallySelectedTextNodes);
        },

        detach: function(detachRange) {
            if (detachRange) {
                this.range.detach();
            }
            this.range = this._current = this._next = this._first = this._last = this.sc = this.so = this.ec = this.eo = null;
        }
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    // Exceptions

    /**
     * @constructor
     */
    function RangeException(codeName) {
        this.code = this[codeName];
        this.codeName = codeName;
        this.message = "RangeException: " + this.codeName;
    }

    RangeException.prototype = {
        BAD_BOUNDARYPOINTS_ERR: 1,
        INVALID_NODE_TYPE_ERR: 2
    };

    RangeException.prototype.toString = function() {
        return this.message;
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    /**
     * Currently iterates through all nodes in the range on creation until I think of a decent way to do it
     * TODO: Look into making this a proper iterator, not requiring preloading everything first
     * @constructor
     */
    function RangeNodeIterator(range, nodeTypes, filter) {
        this.nodes = getNodesInRange(range, nodeTypes, filter);
        this._next = this.nodes[0];
        this._position = 0;
    }

    RangeNodeIterator.prototype = {
        _current: null,

        hasNext: function() {
            return !!this._next;
        },

        next: function() {
            this._current = this._next;
            this._next = this.nodes[ ++this._position ];
            return this._current;
        },

        detach: function() {
            this._current = this._next = this.nodes = null;
        }
    };

    var beforeAfterNodeTypes = [1, 3, 4, 5, 7, 8, 10];
    var rootContainerNodeTypes = [2, 9, 11];
    var readonlyNodeTypes = [5, 6, 10, 12];
    var insertableNodeTypes = [1, 3, 4, 5, 7, 8, 10, 11];
    var surroundNodeTypes = [1, 3, 4, 5, 7, 8];

    function createAncestorFinder(nodeTypes) {
        return function(node, selfIsAncestor) {
            var t, n = selfIsAncestor ? node : node.parentNode;
            while (n) {
                t = n.nodeType;
                if (dom.arrayContains(nodeTypes, t)) {
                    return n;
                }
                n = n.parentNode;
            }
            return null;
        };
    }

    var getRootContainer = dom.getRootContainer;
    var getDocumentOrFragmentContainer = createAncestorFinder( [9, 11] );
    var getReadonlyAncestor = createAncestorFinder(readonlyNodeTypes);
    var getDocTypeNotationEntityAncestor = createAncestorFinder( [6, 10, 12] );

    function assertNoDocTypeNotationEntityAncestor(node, allowSelf) {
        if (getDocTypeNotationEntityAncestor(node, allowSelf)) {
            throw new RangeException("INVALID_NODE_TYPE_ERR");
        }
    }

    function assertNotDetached(range) {
        if (!range.startContainer) {
            throw new DOMException("INVALID_STATE_ERR");
        }
    }

    function assertValidNodeType(node, invalidTypes) {
        if (!dom.arrayContains(invalidTypes, node.nodeType)) {
            throw new RangeException("INVALID_NODE_TYPE_ERR");
        }
    }

    function assertValidOffset(node, offset) {
        if (offset < 0 || offset > (dom.isCharacterDataNode(node) ? node.length : node.childNodes.length)) {
            throw new DOMException("INDEX_SIZE_ERR");
        }
    }

    function assertSameDocumentOrFragment(node1, node2) {
        if (getDocumentOrFragmentContainer(node1, true) !== getDocumentOrFragmentContainer(node2, true)) {
            throw new DOMException("WRONG_DOCUMENT_ERR");
        }
    }

    function assertNodeNotReadOnly(node) {
        if (getReadonlyAncestor(node, true)) {
            throw new DOMException("NO_MODIFICATION_ALLOWED_ERR");
        }
    }

    function assertNode(node, codeName) {
        if (!node) {
            throw new DOMException(codeName);
        }
    }

    function isOrphan(node) {
        return !dom.arrayContains(rootContainerNodeTypes, node.nodeType) && !getDocumentOrFragmentContainer(node, true);
    }

    function isValidOffset(node, offset) {
        return offset <= (dom.isCharacterDataNode(node) ? node.length : node.childNodes.length);
    }

    function isRangeValid(range) {
        return (!!range.startContainer && !!range.endContainer
                && !isOrphan(range.startContainer)
                && !isOrphan(range.endContainer)
                && isValidOffset(range.startContainer, range.startOffset)
                && isValidOffset(range.endContainer, range.endOffset));
    }

    function assertRangeValid(range) {
        assertNotDetached(range);
        if (!isRangeValid(range)) {
            throw new Error("Range error: Range is no longer valid after DOM mutation (" + range.inspect() + ")");
        }
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Test the browser's innerHTML support to decide how to implement createContextualFragment
    var styleEl = document.createElement("style");
    var htmlParsingConforms = false;
    try {
        styleEl.innerHTML = "<b>x</b>";
        htmlParsingConforms = (styleEl.firstChild.nodeType == 3); // Opera incorrectly creates an element node
    } catch (e) {
        // IE 6 and 7 throw
    }

    api.features.htmlParsingConforms = htmlParsingConforms;

    var createContextualFragment = htmlParsingConforms ?

        // Implementation as per HTML parsing spec, trusting in the browser's implementation of innerHTML. See
        // discussion and base code for this implementation at issue 67.
        // Spec: http://html5.org/specs/dom-parsing.html#extensions-to-the-range-interface
        // Thanks to Aleks Williams.
        function(fragmentStr) {
            // "Let node the context object's start's node."
            var node = this.startContainer;
            var doc = dom.getDocument(node);

            // "If the context object's start's node is null, raise an INVALID_STATE_ERR
            // exception and abort these steps."
            if (!node) {
                throw new DOMException("INVALID_STATE_ERR");
            }

            // "Let element be as follows, depending on node's interface:"
            // Document, Document Fragment: null
            var el = null;

            // "Element: node"
            if (node.nodeType == 1) {
                el = node;

            // "Text, Comment: node's parentElement"
            } else if (dom.isCharacterDataNode(node)) {
                el = dom.parentElement(node);
            }

            // "If either element is null or element's ownerDocument is an HTML document
            // and element's local name is "html" and element's namespace is the HTML
            // namespace"
            if (el === null || (
                el.nodeName == "HTML"
                && dom.isHtmlNamespace(dom.getDocument(el).documentElement)
                && dom.isHtmlNamespace(el)
            )) {

            // "let element be a new Element with "body" as its local name and the HTML
            // namespace as its namespace.""
                el = doc.createElement("body");
            } else {
                el = el.cloneNode(false);
            }

            // "If the node's document is an HTML document: Invoke the HTML fragment parsing algorithm."
            // "If the node's document is an XML document: Invoke the XML fragment parsing algorithm."
            // "In either case, the algorithm must be invoked with fragment as the input
            // and element as the context element."
            el.innerHTML = fragmentStr;

            // "If this raises an exception, then abort these steps. Otherwise, let new
            // children be the nodes returned."

            // "Let fragment be a new DocumentFragment."
            // "Append all new children to fragment."
            // "Return fragment."
            return dom.fragmentFromNodeChildren(el);
        } :

        // In this case, innerHTML cannot be trusted, so fall back to a simpler, non-conformant implementation that
        // previous versions of Rangy used (with the exception of using a body element rather than a div)
        function(fragmentStr) {
            assertNotDetached(this);
            var doc = getRangeDocument(this);
            var el = doc.createElement("body");
            el.innerHTML = fragmentStr;

            return dom.fragmentFromNodeChildren(el);
        };

    /*----------------------------------------------------------------------------------------------------------------*/

    var rangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed",
        "commonAncestorContainer"];

    var s2s = 0, s2e = 1, e2e = 2, e2s = 3;
    var n_b = 0, n_a = 1, n_b_a = 2, n_i = 3;

    function RangePrototype() {}

    RangePrototype.prototype = {
        attachListener: function(type, listener) {
            this._listeners[type].push(listener);
        },

        compareBoundaryPoints: function(how, range) {
            assertRangeValid(this);
            assertSameDocumentOrFragment(this.startContainer, range.startContainer);

            var nodeA, offsetA, nodeB, offsetB;
            var prefixA = (how == e2s || how == s2s) ? "start" : "end";
            var prefixB = (how == s2e || how == s2s) ? "start" : "end";
            nodeA = this[prefixA + "Container"];
            offsetA = this[prefixA + "Offset"];
            nodeB = range[prefixB + "Container"];
            offsetB = range[prefixB + "Offset"];
            return dom.comparePoints(nodeA, offsetA, nodeB, offsetB);
        },

        insertNode: function(node) {
            assertRangeValid(this);
            assertValidNodeType(node, insertableNodeTypes);
            assertNodeNotReadOnly(this.startContainer);

            if (dom.isAncestorOf(node, this.startContainer, true)) {
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }

            // No check for whether the container of the start of the Range is of a type that does not allow
            // children of the type of node: the browser's DOM implementation should do this for us when we attempt
            // to add the node

            var firstNodeInserted = insertNodeAtPosition(node, this.startContainer, this.startOffset);
            this.setStartBefore(firstNodeInserted);
        },

        cloneContents: function() {
            assertRangeValid(this);

            var clone, frag;
            if (this.collapsed) {
                return getRangeDocument(this).createDocumentFragment();
            } else {
                if (this.startContainer === this.endContainer && dom.isCharacterDataNode(this.startContainer)) {
                    clone = this.startContainer.cloneNode(true);
                    clone.data = clone.data.slice(this.startOffset, this.endOffset);
                    frag = getRangeDocument(this).createDocumentFragment();
                    frag.appendChild(clone);
                    return frag;
                } else {
                    var iterator = new RangeIterator(this, true);
                    clone = cloneSubtree(iterator);
                    iterator.detach();
                }
                return clone;
            }
        },

        canSurroundContents: function() {
            assertRangeValid(this);
            assertNodeNotReadOnly(this.startContainer);
            assertNodeNotReadOnly(this.endContainer);

            // Check if the contents can be surrounded. Specifically, this means whether the range partially selects
            // no non-text nodes.
            var iterator = new RangeIterator(this, true);
            var boundariesInvalid = (iterator._first && (isNonTextPartiallySelected(iterator._first, this)) ||
                    (iterator._last && isNonTextPartiallySelected(iterator._last, this)));
            iterator.detach();
            return !boundariesInvalid;
        },

        surroundContents: function(node) {
            assertValidNodeType(node, surroundNodeTypes);

            if (!this.canSurroundContents()) {
                throw new RangeException("BAD_BOUNDARYPOINTS_ERR");
            }

            // Extract the contents
            var content = this.extractContents();

            // Clear the children of the node
            if (node.hasChildNodes()) {
                while (node.lastChild) {
                    node.removeChild(node.lastChild);
                }
            }

            // Insert the new node and add the extracted contents
            insertNodeAtPosition(node, this.startContainer, this.startOffset);
            node.appendChild(content);

            this.selectNode(node);
        },

        cloneRange: function() {
            assertRangeValid(this);
            var range = new Range(getRangeDocument(this));
            var i = rangeProperties.length, prop;
            while (i--) {
                prop = rangeProperties[i];
                range[prop] = this[prop];
            }
            return range;
        },

        toString: function() {
            assertRangeValid(this);
            var sc = this.startContainer;
            if (sc === this.endContainer && dom.isCharacterDataNode(sc)) {
                return (sc.nodeType == 3 || sc.nodeType == 4) ? sc.data.slice(this.startOffset, this.endOffset) : "";
            } else {
                var textBits = [], iterator = new RangeIterator(this, true);

                iterateSubtree(iterator, function(node) {
                    // Accept only text or CDATA nodes, not comments

                    if (node.nodeType == 3 || node.nodeType == 4) {
                        textBits.push(node.data);
                    }
                });
                iterator.detach();
                return textBits.join("");
            }
        },

        // The methods below are all non-standard. The following batch were introduced by Mozilla but have since
        // been removed from Mozilla.

        compareNode: function(node) {
            assertRangeValid(this);

            var parent = node.parentNode;
            var nodeIndex = dom.getNodeIndex(node);

            if (!parent) {
                throw new DOMException("NOT_FOUND_ERR");
            }

            var startComparison = this.comparePoint(parent, nodeIndex),
                endComparison = this.comparePoint(parent, nodeIndex + 1);

            if (startComparison < 0) { // Node starts before
                return (endComparison > 0) ? n_b_a : n_b;
            } else {
                return (endComparison > 0) ? n_a : n_i;
            }
        },

        comparePoint: function(node, offset) {
            assertRangeValid(this);
            assertNode(node, "HIERARCHY_REQUEST_ERR");
            assertSameDocumentOrFragment(node, this.startContainer);

            if (dom.comparePoints(node, offset, this.startContainer, this.startOffset) < 0) {
                return -1;
            } else if (dom.comparePoints(node, offset, this.endContainer, this.endOffset) > 0) {
                return 1;
            }
            return 0;
        },

        createContextualFragment: createContextualFragment,

        toHtml: function() {
            assertRangeValid(this);
            var container = getRangeDocument(this).createElement("div");
            container.appendChild(this.cloneContents());
            return container.innerHTML;
        },

        // touchingIsIntersecting determines whether this method considers a node that borders a range intersects
        // with it (as in WebKit) or not (as in Gecko pre-1.9, and the default)
        intersectsNode: function(node, touchingIsIntersecting) {
            assertRangeValid(this);
            assertNode(node, "NOT_FOUND_ERR");
            if (dom.getDocument(node) !== getRangeDocument(this)) {
                return false;
            }

            var parent = node.parentNode, offset = dom.getNodeIndex(node);
            assertNode(parent, "NOT_FOUND_ERR");

            var startComparison = dom.comparePoints(parent, offset, this.endContainer, this.endOffset),
                endComparison = dom.comparePoints(parent, offset + 1, this.startContainer, this.startOffset);

            return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
        },


        isPointInRange: function(node, offset) {
            assertRangeValid(this);
            assertNode(node, "HIERARCHY_REQUEST_ERR");
            assertSameDocumentOrFragment(node, this.startContainer);

            return (dom.comparePoints(node, offset, this.startContainer, this.startOffset) >= 0) &&
                   (dom.comparePoints(node, offset, this.endContainer, this.endOffset) <= 0);
        },

        // The methods below are non-standard and invented by me.

        // Sharing a boundary start-to-end or end-to-start does not count as intersection.
        intersectsRange: function(range, touchingIsIntersecting) {
            assertRangeValid(this);

            if (getRangeDocument(range) != getRangeDocument(this)) {
                throw new DOMException("WRONG_DOCUMENT_ERR");
            }

            var startComparison = dom.comparePoints(this.startContainer, this.startOffset, range.endContainer, range.endOffset),
                endComparison = dom.comparePoints(this.endContainer, this.endOffset, range.startContainer, range.startOffset);

            return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
        },

        intersection: function(range) {
            if (this.intersectsRange(range)) {
                var startComparison = dom.comparePoints(this.startContainer, this.startOffset, range.startContainer, range.startOffset),
                    endComparison = dom.comparePoints(this.endContainer, this.endOffset, range.endContainer, range.endOffset);

                var intersectionRange = this.cloneRange();

                if (startComparison == -1) {
                    intersectionRange.setStart(range.startContainer, range.startOffset);
                }
                if (endComparison == 1) {
                    intersectionRange.setEnd(range.endContainer, range.endOffset);
                }
                return intersectionRange;
            }
            return null;
        },

        union: function(range) {
            if (this.intersectsRange(range, true)) {
                var unionRange = this.cloneRange();
                if (dom.comparePoints(range.startContainer, range.startOffset, this.startContainer, this.startOffset) == -1) {
                    unionRange.setStart(range.startContainer, range.startOffset);
                }
                if (dom.comparePoints(range.endContainer, range.endOffset, this.endContainer, this.endOffset) == 1) {
                    unionRange.setEnd(range.endContainer, range.endOffset);
                }
                return unionRange;
            } else {
                throw new RangeException("Ranges do not intersect");
            }
        },

        containsNode: function(node, allowPartial) {
            if (allowPartial) {
                return this.intersectsNode(node, false);
            } else {
                return this.compareNode(node) == n_i;
            }
        },

        containsNodeContents: function(node) {
            return this.comparePoint(node, 0) >= 0 && this.comparePoint(node, dom.getNodeLength(node)) <= 0;
        },

        containsRange: function(range) {
            return this.intersection(range).equals(range);
        },

        containsNodeText: function(node) {
            var nodeRange = this.cloneRange();
            nodeRange.selectNode(node);
            var textNodes = nodeRange.getNodes([3]);
            if (textNodes.length > 0) {
                nodeRange.setStart(textNodes[0], 0);
                var lastTextNode = textNodes.pop();
                nodeRange.setEnd(lastTextNode, lastTextNode.length);
                var contains = this.containsRange(nodeRange);
                nodeRange.detach();
                return contains;
            } else {
                return this.containsNodeContents(node);
            }
        },

        createNodeIterator: function(nodeTypes, filter) {
            assertRangeValid(this);
            return new RangeNodeIterator(this, nodeTypes, filter);
        },

        getNodes: function(nodeTypes, filter) {
            assertRangeValid(this);
            return getNodesInRange(this, nodeTypes, filter);
        },

        getDocument: function() {
            return getRangeDocument(this);
        },

        collapseBefore: function(node) {
            assertNotDetached(this);

            this.setEndBefore(node);
            this.collapse(false);
        },

        collapseAfter: function(node) {
            assertNotDetached(this);

            this.setStartAfter(node);
            this.collapse(true);
        },

        getName: function() {
            return "DomRange";
        },

        equals: function(range) {
            return Range.rangesEqual(this, range);
        },

        isValid: function() {
            return isRangeValid(this);
        },

        inspect: function() {
            return inspect(this);
        }
    };

    function copyComparisonConstantsToObject(obj) {
        obj.START_TO_START = s2s;
        obj.START_TO_END = s2e;
        obj.END_TO_END = e2e;
        obj.END_TO_START = e2s;

        obj.NODE_BEFORE = n_b;
        obj.NODE_AFTER = n_a;
        obj.NODE_BEFORE_AND_AFTER = n_b_a;
        obj.NODE_INSIDE = n_i;
    }

    function copyComparisonConstants(constructor) {
        copyComparisonConstantsToObject(constructor);
        copyComparisonConstantsToObject(constructor.prototype);
    }

    function createRangeContentRemover(remover, boundaryUpdater) {
        return function() {
            assertRangeValid(this);

            var sc = this.startContainer, so = this.startOffset, root = this.commonAncestorContainer;

            var iterator = new RangeIterator(this, true);

            // Work out where to position the range after content removal
            var node, boundary;
            if (sc !== root) {
                node = dom.getClosestAncestorIn(sc, root, true);
                boundary = getBoundaryAfterNode(node);
                sc = boundary.node;
                so = boundary.offset;
            }

            // Check none of the range is read-only
            iterateSubtree(iterator, assertNodeNotReadOnly);

            iterator.reset();

            // Remove the content
            var returnValue = remover(iterator);
            iterator.detach();

            // Move to the new position
            boundaryUpdater(this, sc, so, sc, so);

            return returnValue;
        };
    }

    function createPrototypeRange(constructor, boundaryUpdater, detacher) {
        function createBeforeAfterNodeSetter(isBefore, isStart) {
            return function(node) {
                assertNotDetached(this);
                assertValidNodeType(node, beforeAfterNodeTypes);
                assertValidNodeType(getRootContainer(node), rootContainerNodeTypes);

                var boundary = (isBefore ? getBoundaryBeforeNode : getBoundaryAfterNode)(node);
                (isStart ? setRangeStart : setRangeEnd)(this, boundary.node, boundary.offset);
            };
        }

        function setRangeStart(range, node, offset) {
            var ec = range.endContainer, eo = range.endOffset;
            if (node !== range.startContainer || offset !== range.startOffset) {
                // Check the root containers of the range and the new boundary, and also check whether the new boundary
                // is after the current end. In either case, collapse the range to the new position
                if (getRootContainer(node) != getRootContainer(ec) || dom.comparePoints(node, offset, ec, eo) == 1) {
                    ec = node;
                    eo = offset;
                }
                boundaryUpdater(range, node, offset, ec, eo);
            }
        }

        function setRangeEnd(range, node, offset) {
            var sc = range.startContainer, so = range.startOffset;
            if (node !== range.endContainer || offset !== range.endOffset) {
                // Check the root containers of the range and the new boundary, and also check whether the new boundary
                // is after the current end. In either case, collapse the range to the new position
                if (getRootContainer(node) != getRootContainer(sc) || dom.comparePoints(node, offset, sc, so) == -1) {
                    sc = node;
                    so = offset;
                }
                boundaryUpdater(range, sc, so, node, offset);
            }
        }

        function setRangeStartAndEnd(range, node, offset) {
            if (node !== range.startContainer || offset !== range.startOffset || node !== range.endContainer || offset !== range.endOffset) {
                boundaryUpdater(range, node, offset, node, offset);
            }
        }

        constructor.prototype = new RangePrototype();

        api.util.extend(constructor.prototype, {
            setStart: function(node, offset) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);

                setRangeStart(this, node, offset);
            },

            setEnd: function(node, offset) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);

                setRangeEnd(this, node, offset);
            },

            setStartBefore: createBeforeAfterNodeSetter(true, true),
            setStartAfter: createBeforeAfterNodeSetter(false, true),
            setEndBefore: createBeforeAfterNodeSetter(true, false),
            setEndAfter: createBeforeAfterNodeSetter(false, false),

            collapse: function(isStart) {
                assertRangeValid(this);
                if (isStart) {
                    boundaryUpdater(this, this.startContainer, this.startOffset, this.startContainer, this.startOffset);
                } else {
                    boundaryUpdater(this, this.endContainer, this.endOffset, this.endContainer, this.endOffset);
                }
            },

            selectNodeContents: function(node) {
                // This doesn't seem well specified: the spec talks only about selecting the node's contents, which
                // could be taken to mean only its children. However, browsers implement this the same as selectNode for
                // text nodes, so I shall do likewise
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);

                boundaryUpdater(this, node, 0, node, dom.getNodeLength(node));
            },

            selectNode: function(node) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, false);
                assertValidNodeType(node, beforeAfterNodeTypes);

                var start = getBoundaryBeforeNode(node), end = getBoundaryAfterNode(node);
                boundaryUpdater(this, start.node, start.offset, end.node, end.offset);
            },

            extractContents: createRangeContentRemover(extractSubtree, boundaryUpdater),

            deleteContents: createRangeContentRemover(deleteSubtree, boundaryUpdater),

            canSurroundContents: function() {
                assertRangeValid(this);
                assertNodeNotReadOnly(this.startContainer);
                assertNodeNotReadOnly(this.endContainer);

                // Check if the contents can be surrounded. Specifically, this means whether the range partially selects
                // no non-text nodes.
                var iterator = new RangeIterator(this, true);
                var boundariesInvalid = (iterator._first && (isNonTextPartiallySelected(iterator._first, this)) ||
                        (iterator._last && isNonTextPartiallySelected(iterator._last, this)));
                iterator.detach();
                return !boundariesInvalid;
            },

            detach: function() {
                detacher(this);
            },

            splitBoundaries: function() {
                assertRangeValid(this);


                var sc = this.startContainer, so = this.startOffset, ec = this.endContainer, eo = this.endOffset;
                var startEndSame = (sc === ec);

                if (dom.isCharacterDataNode(ec) && eo > 0 && eo < ec.length) {
                    dom.splitDataNode(ec, eo);

                }

                if (dom.isCharacterDataNode(sc) && so > 0 && so < sc.length) {

                    sc = dom.splitDataNode(sc, so);
                    if (startEndSame) {
                        eo -= so;
                        ec = sc;
                    } else if (ec == sc.parentNode && eo >= dom.getNodeIndex(sc)) {
                        eo++;
                    }
                    so = 0;

                }
                boundaryUpdater(this, sc, so, ec, eo);
            },

            normalizeBoundaries: function() {
                assertRangeValid(this);

                var sc = this.startContainer, so = this.startOffset, ec = this.endContainer, eo = this.endOffset;

                var mergeForward = function(node) {
                    var sibling = node.nextSibling;
                    if (sibling && sibling.nodeType == node.nodeType) {
                        ec = node;
                        eo = node.length;
                        node.appendData(sibling.data);
                        sibling.parentNode.removeChild(sibling);
                    }
                };

                var mergeBackward = function(node) {
                    var sibling = node.previousSibling;
                    if (sibling && sibling.nodeType == node.nodeType) {
                        sc = node;
                        var nodeLength = node.length;
                        so = sibling.length;
                        node.insertData(0, sibling.data);
                        sibling.parentNode.removeChild(sibling);
                        if (sc == ec) {
                            eo += so;
                            ec = sc;
                        } else if (ec == node.parentNode) {
                            var nodeIndex = dom.getNodeIndex(node);
                            if (eo == nodeIndex) {
                                ec = node;
                                eo = nodeLength;
                            } else if (eo > nodeIndex) {
                                eo--;
                            }
                        }
                    }
                };

                var normalizeStart = true;

                if (dom.isCharacterDataNode(ec)) {
                    if (ec.length == eo) {
                        mergeForward(ec);
                    }
                } else {
                    if (eo > 0) {
                        var endNode = ec.childNodes[eo - 1];
                        if (endNode && dom.isCharacterDataNode(endNode)) {
                            mergeForward(endNode);
                        }
                    }
                    normalizeStart = !this.collapsed;
                }

                if (normalizeStart) {
                    if (dom.isCharacterDataNode(sc)) {
                        if (so == 0) {
                            mergeBackward(sc);
                        }
                    } else {
                        if (so < sc.childNodes.length) {
                            var startNode = sc.childNodes[so];
                            if (startNode && dom.isCharacterDataNode(startNode)) {
                                mergeBackward(startNode);
                            }
                        }
                    }
                } else {
                    sc = ec;
                    so = eo;
                }

                boundaryUpdater(this, sc, so, ec, eo);
            },

            collapseToPoint: function(node, offset) {
                assertNotDetached(this);

                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);

                setRangeStartAndEnd(this, node, offset);
            }
        });

        copyComparisonConstants(constructor);
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Updates commonAncestorContainer and collapsed after boundary change
    function updateCollapsedAndCommonAncestor(range) {
        range.collapsed = (range.startContainer === range.endContainer && range.startOffset === range.endOffset);
        range.commonAncestorContainer = range.collapsed ?
            range.startContainer : dom.getCommonAncestor(range.startContainer, range.endContainer);
    }

    function updateBoundaries(range, startContainer, startOffset, endContainer, endOffset) {
        var startMoved = (range.startContainer !== startContainer || range.startOffset !== startOffset);
        var endMoved = (range.endContainer !== endContainer || range.endOffset !== endOffset);

        range.startContainer = startContainer;
        range.startOffset = startOffset;
        range.endContainer = endContainer;
        range.endOffset = endOffset;

        updateCollapsedAndCommonAncestor(range);
        dispatchEvent(range, "boundarychange", {startMoved: startMoved, endMoved: endMoved});
    }

    function detach(range) {
        assertNotDetached(range);
        range.startContainer = range.startOffset = range.endContainer = range.endOffset = null;
        range.collapsed = range.commonAncestorContainer = null;
        dispatchEvent(range, "detach", null);
        range._listeners = null;
    }

    /**
     * @constructor
     */
    function Range(doc) {
        this.startContainer = doc;
        this.startOffset = 0;
        this.endContainer = doc;
        this.endOffset = 0;
        this._listeners = {
            boundarychange: [],
            detach: []
        };
        updateCollapsedAndCommonAncestor(this);
    }

    createPrototypeRange(Range, updateBoundaries, detach);

    api.rangePrototype = RangePrototype.prototype;

    Range.rangeProperties = rangeProperties;
    Range.RangeIterator = RangeIterator;
    Range.copyComparisonConstants = copyComparisonConstants;
    Range.createPrototypeRange = createPrototypeRange;
    Range.inspect = inspect;
    Range.getRangeDocument = getRangeDocument;
    Range.rangesEqual = function(r1, r2) {
        return r1.startContainer === r2.startContainer &&
               r1.startOffset === r2.startOffset &&
               r1.endContainer === r2.endContainer &&
               r1.endOffset === r2.endOffset;
    };

    api.DomRange = Range;
    api.RangeException = RangeException;
});rangy.createModule("WrappedRange", function(api, module) {
    api.requireModules( ["DomUtil", "DomRange"] );

    /**
     * @constructor
     */
    var WrappedRange;
    var dom = api.dom;
    var DomPosition = dom.DomPosition;
    var DomRange = api.DomRange;



    /*----------------------------------------------------------------------------------------------------------------*/

    /*
    This is a workaround for a bug where IE returns the wrong container element from the TextRange's parentElement()
    method. For example, in the following (where pipes denote the selection boundaries):

    <ul id="ul"><li id="a">| a </li><li id="b"> b |</li></ul>

    var range = document.selection.createRange();
    alert(range.parentElement().id); // Should alert "ul" but alerts "b"

    This method returns the common ancestor node of the following:
    - the parentElement() of the textRange
    - the parentElement() of the textRange after calling collapse(true)
    - the parentElement() of the textRange after calling collapse(false)
     */
    function getTextRangeContainerElement(textRange) {
        var parentEl = textRange.parentElement();

        var range = textRange.duplicate();
        range.collapse(true);
        var startEl = range.parentElement();
        range = textRange.duplicate();
        range.collapse(false);
        var endEl = range.parentElement();
        var startEndContainer = (startEl == endEl) ? startEl : dom.getCommonAncestor(startEl, endEl);

        return startEndContainer == parentEl ? startEndContainer : dom.getCommonAncestor(parentEl, startEndContainer);
    }

    function textRangeIsCollapsed(textRange) {
        return textRange.compareEndPoints("StartToEnd", textRange) == 0;
    }

    // Gets the boundary of a TextRange expressed as a node and an offset within that node. This function started out as
    // an improved version of code found in Tim Cameron Ryan's IERange (http://code.google.com/p/ierange/) but has
    // grown, fixing problems with line breaks in preformatted text, adding workaround for IE TextRange bugs, handling
    // for inputs and images, plus optimizations.
    function getTextRangeBoundaryPosition(textRange, wholeRangeContainerElement, isStart, isCollapsed) {
        var workingRange = textRange.duplicate();

        workingRange.collapse(isStart);
        var containerElement = workingRange.parentElement();

        // Sometimes collapsing a TextRange that's at the start of a text node can move it into the previous node, so
        // check for that
        // TODO: Find out when. Workaround for wholeRangeContainerElement may break this
        if (!dom.isAncestorOf(wholeRangeContainerElement, containerElement, true)) {
            containerElement = wholeRangeContainerElement;

        }



        // Deal with nodes that cannot "contain rich HTML markup". In practice, this means form inputs, images and
        // similar. See http://msdn.microsoft.com/en-us/library/aa703950%28VS.85%29.aspx
        if (!containerElement.canHaveHTML) {
            return new DomPosition(containerElement.parentNode, dom.getNodeIndex(containerElement));
        }

        var workingNode = dom.getDocument(containerElement).createElement("span");
        var comparison, workingComparisonType = isStart ? "StartToStart" : "StartToEnd";
        var previousNode, nextNode, boundaryPosition, boundaryNode;

        // Move the working range through the container's children, starting at the end and working backwards, until the
        // working range reaches or goes past the boundary we're interested in
        do {
            containerElement.insertBefore(workingNode, workingNode.previousSibling);
            workingRange.moveToElementText(workingNode);
        } while ( (comparison = workingRange.compareEndPoints(workingComparisonType, textRange)) > 0 &&
                workingNode.previousSibling);

        // We've now reached or gone past the boundary of the text range we're interested in
        // so have identified the node we want
        boundaryNode = workingNode.nextSibling;

        if (comparison == -1 && boundaryNode && dom.isCharacterDataNode(boundaryNode)) {
            // This is a character data node (text, comment, cdata). The working range is collapsed at the start of the
            // node containing the text range's boundary, so we move the end of the working range to the boundary point
            // and measure the length of its text to get the boundary's offset within the node.
            workingRange.setEndPoint(isStart ? "EndToStart" : "EndToEnd", textRange);


            var offset;

            if (/[\r\n]/.test(boundaryNode.data)) {
                /*
                For the particular case of a boundary within a text node containing line breaks (within a <pre> element,
                for example), we need a slightly complicated approach to get the boundary's offset in IE. The facts:

                - Each line break is represented as \r in the text node's data/nodeValue properties
                - Each line break is represented as \r\n in the TextRange's 'text' property
                - The 'text' property of the TextRange does not contain trailing line breaks

                To get round the problem presented by the final fact above, we can use the fact that TextRange's
                moveStart() and moveEnd() methods return the actual number of characters moved, which is not necessarily
                the same as the number of characters it was instructed to move. The simplest approach is to use this to
                store the characters moved when moving both the start and end of the range to the start of the document
                body and subtracting the start offset from the end offset (the "move-negative-gazillion" method).
                However, this is extremely slow when the document is large and the range is near the end of it. Clearly
                doing the mirror image (i.e. moving the range boundaries to the end of the document) has the same
                problem.

                Another approach that works is to use moveStart() to move the start boundary of the range up to the end
                boundary one character at a time and incrementing a counter with the value returned by the moveStart()
                call. However, the check for whether the start boundary has reached the end boundary is expensive, so
                this method is slow (although unlike "move-negative-gazillion" is largely unaffected by the location of
                the range within the document).

                The method below is a hybrid of the two methods above. It uses the fact that a string containing the
                TextRange's 'text' property with each \r\n converted to a single \r character cannot be longer than the
                text of the TextRange, so the start of the range is moved that length initially and then a character at
                a time to make up for any trailing line breaks not contained in the 'text' property. This has good
                performance in most situations compared to the previous two methods.
                */
                var tempRange = workingRange.duplicate();
                var rangeLength = tempRange.text.replace(/\r\n/g, "\r").length;

                offset = tempRange.moveStart("character", rangeLength);
                while ( (comparison = tempRange.compareEndPoints("StartToEnd", tempRange)) == -1) {
                    offset++;
                    tempRange.moveStart("character", 1);
                }
            } else {
                offset = workingRange.text.length;
            }
            boundaryPosition = new DomPosition(boundaryNode, offset);
        } else {


            // If the boundary immediately follows a character data node and this is the end boundary, we should favour
            // a position within that, and likewise for a start boundary preceding a character data node
            previousNode = (isCollapsed || !isStart) && workingNode.previousSibling;
            nextNode = (isCollapsed || isStart) && workingNode.nextSibling;



            if (nextNode && dom.isCharacterDataNode(nextNode)) {
                boundaryPosition = new DomPosition(nextNode, 0);
            } else if (previousNode && dom.isCharacterDataNode(previousNode)) {
                boundaryPosition = new DomPosition(previousNode, previousNode.length);
            } else {
                boundaryPosition = new DomPosition(containerElement, dom.getNodeIndex(workingNode));
            }
        }

        // Clean up
        workingNode.parentNode.removeChild(workingNode);

        return boundaryPosition;
    }

    // Returns a TextRange representing the boundary of a TextRange expressed as a node and an offset within that node.
    // This function started out as an optimized version of code found in Tim Cameron Ryan's IERange
    // (http://code.google.com/p/ierange/)
    function createBoundaryTextRange(boundaryPosition, isStart) {
        var boundaryNode, boundaryParent, boundaryOffset = boundaryPosition.offset;
        var doc = dom.getDocument(boundaryPosition.node);
        var workingNode, childNodes, workingRange = doc.body.createTextRange();
        var nodeIsDataNode = dom.isCharacterDataNode(boundaryPosition.node);

        if (nodeIsDataNode) {
            boundaryNode = boundaryPosition.node;
            boundaryParent = boundaryNode.parentNode;
        } else {
            childNodes = boundaryPosition.node.childNodes;
            boundaryNode = (boundaryOffset < childNodes.length) ? childNodes[boundaryOffset] : null;
            boundaryParent = boundaryPosition.node;
        }

        // Position the range immediately before the node containing the boundary
        workingNode = doc.createElement("span");

        // Making the working element non-empty element persuades IE to consider the TextRange boundary to be within the
        // element rather than immediately before or after it, which is what we want
        workingNode.innerHTML = "&#feff;";

        // insertBefore is supposed to work like appendChild if the second parameter is null. However, a bug report
        // for IERange suggests that it can crash the browser: http://code.google.com/p/ierange/issues/detail?id=12
        if (boundaryNode) {
            boundaryParent.insertBefore(workingNode, boundaryNode);
        } else {
            boundaryParent.appendChild(workingNode);
        }

        workingRange.moveToElementText(workingNode);
        workingRange.collapse(!isStart);

        // Clean up
        boundaryParent.removeChild(workingNode);

        // Move the working range to the text offset, if required
        if (nodeIsDataNode) {
            workingRange[isStart ? "moveStart" : "moveEnd"]("character", boundaryOffset);
        }

        return workingRange;
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    if (api.features.implementsDomRange && (!api.features.implementsTextRange || !api.config.preferTextRange)) {
        // This is a wrapper around the browser's native DOM Range. It has two aims:
        // - Provide workarounds for specific browser bugs
        // - provide convenient extensions, which are inherited from Rangy's DomRange

        (function() {
            var rangeProto;
            var rangeProperties = DomRange.rangeProperties;
            var canSetRangeStartAfterEnd;

            function updateRangeProperties(range) {
                var i = rangeProperties.length, prop;
                while (i--) {
                    prop = rangeProperties[i];
                    range[prop] = range.nativeRange[prop];
                }
            }

            function updateNativeRange(range, startContainer, startOffset, endContainer,endOffset) {
                var startMoved = (range.startContainer !== startContainer || range.startOffset != startOffset);
                var endMoved = (range.endContainer !== endContainer || range.endOffset != endOffset);

                // Always set both boundaries for the benefit of IE9 (see issue 35)
                if (startMoved || endMoved) {
                    range.setEnd(endContainer, endOffset);
                    range.setStart(startContainer, startOffset);
                }
            }

            function detach(range) {
                range.nativeRange.detach();
                range.detached = true;
                var i = rangeProperties.length, prop;
                while (i--) {
                    prop = rangeProperties[i];
                    range[prop] = null;
                }
            }

            var createBeforeAfterNodeSetter;

            WrappedRange = function(range) {
                if (!range) {
                    throw new Error("Range must be specified");
                }
                this.nativeRange = range;
                updateRangeProperties(this);
            };

            DomRange.createPrototypeRange(WrappedRange, updateNativeRange, detach);

            rangeProto = WrappedRange.prototype;

            rangeProto.selectNode = function(node) {
                this.nativeRange.selectNode(node);
                updateRangeProperties(this);
            };

            rangeProto.deleteContents = function() {
                this.nativeRange.deleteContents();
                updateRangeProperties(this);
            };

            rangeProto.extractContents = function() {
                var frag = this.nativeRange.extractContents();
                updateRangeProperties(this);
                return frag;
            };

            rangeProto.cloneContents = function() {
                return this.nativeRange.cloneContents();
            };

            // TODO: Until I can find a way to programmatically trigger the Firefox bug (apparently long-standing, still
            // present in 3.6.8) that throws "Index or size is negative or greater than the allowed amount" for
            // insertNode in some circumstances, all browsers will have to use the Rangy's own implementation of
            // insertNode, which works but is almost certainly slower than the native implementation.
/*
            rangeProto.insertNode = function(node) {
                this.nativeRange.insertNode(node);
                updateRangeProperties(this);
            };
*/

            rangeProto.surroundContents = function(node) {
                this.nativeRange.surroundContents(node);
                updateRangeProperties(this);
            };

            rangeProto.collapse = function(isStart) {
                this.nativeRange.collapse(isStart);
                updateRangeProperties(this);
            };

            rangeProto.cloneRange = function() {
                return new WrappedRange(this.nativeRange.cloneRange());
            };

            rangeProto.refresh = function() {
                updateRangeProperties(this);
            };

            rangeProto.toString = function() {
                return this.nativeRange.toString();
            };

            // Create test range and node for feature detection

            var testTextNode = document.createTextNode("test");
            dom.getBody(document).appendChild(testTextNode);
            var range = document.createRange();

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for Firefox 2 bug that prevents moving the start of a Range to a point after its current end and
            // correct for it

            range.setStart(testTextNode, 0);
            range.setEnd(testTextNode, 0);

            try {
                range.setStart(testTextNode, 1);
                canSetRangeStartAfterEnd = true;

                rangeProto.setStart = function(node, offset) {
                    this.nativeRange.setStart(node, offset);
                    updateRangeProperties(this);
                };

                rangeProto.setEnd = function(node, offset) {
                    this.nativeRange.setEnd(node, offset);
                    updateRangeProperties(this);
                };

                createBeforeAfterNodeSetter = function(name) {
                    return function(node) {
                        this.nativeRange[name](node);
                        updateRangeProperties(this);
                    };
                };

            } catch(ex) {


                canSetRangeStartAfterEnd = false;

                rangeProto.setStart = function(node, offset) {
                    try {
                        this.nativeRange.setStart(node, offset);
                    } catch (ex) {
                        this.nativeRange.setEnd(node, offset);
                        this.nativeRange.setStart(node, offset);
                    }
                    updateRangeProperties(this);
                };

                rangeProto.setEnd = function(node, offset) {
                    try {
                        this.nativeRange.setEnd(node, offset);
                    } catch (ex) {
                        this.nativeRange.setStart(node, offset);
                        this.nativeRange.setEnd(node, offset);
                    }
                    updateRangeProperties(this);
                };

                createBeforeAfterNodeSetter = function(name, oppositeName) {
                    return function(node) {
                        try {
                            this.nativeRange[name](node);
                        } catch (ex) {
                            this.nativeRange[oppositeName](node);
                            this.nativeRange[name](node);
                        }
                        updateRangeProperties(this);
                    };
                };
            }

            rangeProto.setStartBefore = createBeforeAfterNodeSetter("setStartBefore", "setEndBefore");
            rangeProto.setStartAfter = createBeforeAfterNodeSetter("setStartAfter", "setEndAfter");
            rangeProto.setEndBefore = createBeforeAfterNodeSetter("setEndBefore", "setStartBefore");
            rangeProto.setEndAfter = createBeforeAfterNodeSetter("setEndAfter", "setStartAfter");

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for and correct Firefox 2 behaviour with selectNodeContents on text nodes: it collapses the range to
            // the 0th character of the text node
            range.selectNodeContents(testTextNode);
            if (range.startContainer == testTextNode && range.endContainer == testTextNode &&
                    range.startOffset == 0 && range.endOffset == testTextNode.length) {
                rangeProto.selectNodeContents = function(node) {
                    this.nativeRange.selectNodeContents(node);
                    updateRangeProperties(this);
                };
            } else {
                rangeProto.selectNodeContents = function(node) {
                    this.setStart(node, 0);
                    this.setEnd(node, DomRange.getEndOffset(node));
                };
            }

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for WebKit bug that has the beahviour of compareBoundaryPoints round the wrong way for constants
            // START_TO_END and END_TO_START: https://bugs.webkit.org/show_bug.cgi?id=20738

            range.selectNodeContents(testTextNode);
            range.setEnd(testTextNode, 3);

            var range2 = document.createRange();
            range2.selectNodeContents(testTextNode);
            range2.setEnd(testTextNode, 4);
            range2.setStart(testTextNode, 2);

            if (range.compareBoundaryPoints(range.START_TO_END, range2) == -1 &
                    range.compareBoundaryPoints(range.END_TO_START, range2) == 1) {
                // This is the wrong way round, so correct for it


                rangeProto.compareBoundaryPoints = function(type, range) {
                    range = range.nativeRange || range;
                    if (type == range.START_TO_END) {
                        type = range.END_TO_START;
                    } else if (type == range.END_TO_START) {
                        type = range.START_TO_END;
                    }
                    return this.nativeRange.compareBoundaryPoints(type, range);
                };
            } else {
                rangeProto.compareBoundaryPoints = function(type, range) {
                    return this.nativeRange.compareBoundaryPoints(type, range.nativeRange || range);
                };
            }

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for existence of createContextualFragment and delegate to it if it exists
            if (api.util.isHostMethod(range, "createContextualFragment")) {
                rangeProto.createContextualFragment = function(fragmentStr) {
                    return this.nativeRange.createContextualFragment(fragmentStr);
                };
            }

            /*--------------------------------------------------------------------------------------------------------*/

            // Clean up
            dom.getBody(document).removeChild(testTextNode);
            range.detach();
            range2.detach();
        })();

        api.createNativeRange = function(doc) {
            doc = doc || document;
            return doc.createRange();
        };
    } else if (api.features.implementsTextRange) {
        // This is a wrapper around a TextRange, providing full DOM Range functionality using rangy's DomRange as a
        // prototype

        WrappedRange = function(textRange) {
            this.textRange = textRange;
            this.refresh();
        };

        WrappedRange.prototype = new DomRange(document);

        WrappedRange.prototype.refresh = function() {
            var start, end;

            // TextRange's parentElement() method cannot be trusted. getTextRangeContainerElement() works around that.
            var rangeContainerElement = getTextRangeContainerElement(this.textRange);

            if (textRangeIsCollapsed(this.textRange)) {
                end = start = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true, true);
            } else {

                start = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true, false);
                end = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, false, false);
            }

            this.setStart(start.node, start.offset);
            this.setEnd(end.node, end.offset);
        };

        DomRange.copyComparisonConstants(WrappedRange);

        // Add WrappedRange as the Range property of the global object to allow expression like Range.END_TO_END to work
        var globalObj = (function() { return this; })();
        if (typeof globalObj.Range == "undefined") {
            globalObj.Range = WrappedRange;
        }

        api.createNativeRange = function(doc) {
            doc = doc || document;
            return doc.body.createTextRange();
        };
    }

    if (api.features.implementsTextRange) {
        WrappedRange.rangeToTextRange = function(range) {
            if (range.collapsed) {
                var tr = createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);



                return tr;

                //return createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
            } else {
                var startRange = createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
                var endRange = createBoundaryTextRange(new DomPosition(range.endContainer, range.endOffset), false);
                var textRange = dom.getDocument(range.startContainer).body.createTextRange();
                textRange.setEndPoint("StartToStart", startRange);
                textRange.setEndPoint("EndToEnd", endRange);
                return textRange;
            }
        };
    }

    WrappedRange.prototype.getName = function() {
        return "WrappedRange";
    };

    api.WrappedRange = WrappedRange;

    api.createRange = function(doc) {
        doc = doc || document;
        return new WrappedRange(api.createNativeRange(doc));
    };

    api.createRangyRange = function(doc) {
        doc = doc || document;
        return new DomRange(doc);
    };

    api.createIframeRange = function(iframeEl) {
        return api.createRange(dom.getIframeDocument(iframeEl));
    };

    api.createIframeRangyRange = function(iframeEl) {
        return api.createRangyRange(dom.getIframeDocument(iframeEl));
    };

    api.addCreateMissingNativeApiListener(function(win) {
        var doc = win.document;
        if (typeof doc.createRange == "undefined") {
            doc.createRange = function() {
                return api.createRange(this);
            };
        }
        doc = win = null;
    });
});rangy.createModule("WrappedSelection", function(api, module) {
    // This will create a selection object wrapper that follows the Selection object found in the WHATWG draft DOM Range
    // spec (http://html5.org/specs/dom-range.html)

    api.requireModules( ["DomUtil", "DomRange", "WrappedRange"] );

    api.config.checkSelectionRanges = true;

    var BOOLEAN = "boolean",
        windowPropertyName = "_rangySelection",
        dom = api.dom,
        util = api.util,
        DomRange = api.DomRange,
        WrappedRange = api.WrappedRange,
        DOMException = api.DOMException,
        DomPosition = dom.DomPosition,
        getSelection,
        selectionIsCollapsed,
        CONTROL = "Control";



    function getWinSelection(winParam) {
        return (winParam || window).getSelection();
    }

    function getDocSelection(winParam) {
        return (winParam || window).document.selection;
    }

    // Test for the Range/TextRange and Selection features required
    // Test for ability to retrieve selection
    var implementsWinGetSelection = api.util.isHostMethod(window, "getSelection"),
        implementsDocSelection = api.util.isHostObject(document, "selection");

    var useDocumentSelection = implementsDocSelection && (!implementsWinGetSelection || api.config.preferTextRange);

    if (useDocumentSelection) {
        getSelection = getDocSelection;
        api.isSelectionValid = function(winParam) {
            var doc = (winParam || window).document, nativeSel = doc.selection;

            // Check whether the selection TextRange is actually contained within the correct document
            return (nativeSel.type != "None" || dom.getDocument(nativeSel.createRange().parentElement()) == doc);
        };
    } else if (implementsWinGetSelection) {
        getSelection = getWinSelection;
        api.isSelectionValid = function() {
            return true;
        };
    } else {
        module.fail("Neither document.selection or window.getSelection() detected.");
    }

    api.getNativeSelection = getSelection;

    var testSelection = getSelection();
    var testRange = api.createNativeRange(document);
    var body = dom.getBody(document);

    // Obtaining a range from a selection
    var selectionHasAnchorAndFocus = util.areHostObjects(testSelection, ["anchorNode", "focusNode"] &&
                                     util.areHostProperties(testSelection, ["anchorOffset", "focusOffset"]));
    api.features.selectionHasAnchorAndFocus = selectionHasAnchorAndFocus;

    // Test for existence of native selection extend() method
    var selectionHasExtend = util.isHostMethod(testSelection, "extend");
    api.features.selectionHasExtend = selectionHasExtend;

    // Test if rangeCount exists
    var selectionHasRangeCount = (typeof testSelection.rangeCount == "number");
    api.features.selectionHasRangeCount = selectionHasRangeCount;

    var selectionSupportsMultipleRanges = false;
    var collapsedNonEditableSelectionsSupported = true;

    if (util.areHostMethods(testSelection, ["addRange", "getRangeAt", "removeAllRanges"]) &&
            typeof testSelection.rangeCount == "number" && api.features.implementsDomRange) {

        (function() {
            var iframe = document.createElement("iframe");
            iframe.frameBorder = 0;
            iframe.style.position = "absolute";
            iframe.style.left = "-10000px";
            body.appendChild(iframe);

            var iframeDoc = dom.getIframeDocument(iframe);
            iframeDoc.open();
            iframeDoc.write("<html><head></head><body>12</body></html>");
            iframeDoc.close();

            var sel = dom.getIframeWindow(iframe).getSelection();
            var docEl = iframeDoc.documentElement;
            var iframeBody = docEl.lastChild, textNode = iframeBody.firstChild;

            // Test whether the native selection will allow a collapsed selection within a non-editable element
            var r1 = iframeDoc.createRange();
            r1.setStart(textNode, 1);
            r1.collapse(true);
            sel.addRange(r1);
            collapsedNonEditableSelectionsSupported = (sel.rangeCount == 1);
            sel.removeAllRanges();

            // Test whether the native selection is capable of supporting multiple ranges
            var r2 = r1.cloneRange();
            r1.setStart(textNode, 0);
            r2.setEnd(textNode, 2);
            sel.addRange(r1);
            sel.addRange(r2);

            selectionSupportsMultipleRanges = (sel.rangeCount == 2);

            // Clean up
            r1.detach();
            r2.detach();

            body.removeChild(iframe);
        })();
    }

    api.features.selectionSupportsMultipleRanges = selectionSupportsMultipleRanges;
    api.features.collapsedNonEditableSelectionsSupported = collapsedNonEditableSelectionsSupported;

    // ControlRanges
    var implementsControlRange = false, testControlRange;

    if (body && util.isHostMethod(body, "createControlRange")) {
        testControlRange = body.createControlRange();
        if (util.areHostProperties(testControlRange, ["item", "add"])) {
            implementsControlRange = true;
        }
    }
    api.features.implementsControlRange = implementsControlRange;

    // Selection collapsedness
    if (selectionHasAnchorAndFocus) {
        selectionIsCollapsed = function(sel) {
            return sel.anchorNode === sel.focusNode && sel.anchorOffset === sel.focusOffset;
        };
    } else {
        selectionIsCollapsed = function(sel) {
            return sel.rangeCount ? sel.getRangeAt(sel.rangeCount - 1).collapsed : false;
        };
    }

    function updateAnchorAndFocusFromRange(sel, range, backwards) {
        var anchorPrefix = backwards ? "end" : "start", focusPrefix = backwards ? "start" : "end";
        sel.anchorNode = range[anchorPrefix + "Container"];
        sel.anchorOffset = range[anchorPrefix + "Offset"];
        sel.focusNode = range[focusPrefix + "Container"];
        sel.focusOffset = range[focusPrefix + "Offset"];
    }

    function updateAnchorAndFocusFromNativeSelection(sel) {
        var nativeSel = sel.nativeSelection;
        sel.anchorNode = nativeSel.anchorNode;
        sel.anchorOffset = nativeSel.anchorOffset;
        sel.focusNode = nativeSel.focusNode;
        sel.focusOffset = nativeSel.focusOffset;
    }

    function updateEmptySelection(sel) {
        sel.anchorNode = sel.focusNode = null;
        sel.anchorOffset = sel.focusOffset = 0;
        sel.rangeCount = 0;
        sel.isCollapsed = true;
        sel._ranges.length = 0;
    }

    function getNativeRange(range) {
        var nativeRange;
        if (range instanceof DomRange) {
            nativeRange = range._selectionNativeRange;
            if (!nativeRange) {
                nativeRange = api.createNativeRange(dom.getDocument(range.startContainer));
                nativeRange.setEnd(range.endContainer, range.endOffset);
                nativeRange.setStart(range.startContainer, range.startOffset);
                range._selectionNativeRange = nativeRange;
                range.attachListener("detach", function() {

                    this._selectionNativeRange = null;
                });
            }
        } else if (range instanceof WrappedRange) {
            nativeRange = range.nativeRange;
        } else if (api.features.implementsDomRange && (range instanceof dom.getWindow(range.startContainer).Range)) {
            nativeRange = range;
        }
        return nativeRange;
    }

    function rangeContainsSingleElement(rangeNodes) {
        if (!rangeNodes.length || rangeNodes[0].nodeType != 1) {
            return false;
        }
        for (var i = 1, len = rangeNodes.length; i < len; ++i) {
            if (!dom.isAncestorOf(rangeNodes[0], rangeNodes[i])) {
                return false;
            }
        }
        return true;
    }

    function getSingleElementFromRange(range) {
        var nodes = range.getNodes();
        if (!rangeContainsSingleElement(nodes)) {
            throw new Error("getSingleElementFromRange: range " + range.inspect() + " did not consist of a single element");
        }
        return nodes[0];
    }

    function isTextRange(range) {
        return !!range && typeof range.text != "undefined";
    }

    function updateFromTextRange(sel, range) {
        // Create a Range from the selected TextRange
        var wrappedRange = new WrappedRange(range);
        sel._ranges = [wrappedRange];

        updateAnchorAndFocusFromRange(sel, wrappedRange, false);
        sel.rangeCount = 1;
        sel.isCollapsed = wrappedRange.collapsed;
    }

    function updateControlSelection(sel) {
        // Update the wrapped selection based on what's now in the native selection
        sel._ranges.length = 0;
        if (sel.docSelection.type == "None") {
            updateEmptySelection(sel);
        } else {
            var controlRange = sel.docSelection.createRange();
            if (isTextRange(controlRange)) {
                // This case (where the selection type is "Control" and calling createRange() on the selection returns
                // a TextRange) can happen in IE 9. It happens, for example, when all elements in the selected
                // ControlRange have been removed from the ControlRange and removed from the document.
                updateFromTextRange(sel, controlRange);
            } else {
                sel.rangeCount = controlRange.length;
                var range, doc = dom.getDocument(controlRange.item(0));
                for (var i = 0; i < sel.rangeCount; ++i) {
                    range = api.createRange(doc);
                    range.selectNode(controlRange.item(i));
                    sel._ranges.push(range);
                }
                sel.isCollapsed = sel.rangeCount == 1 && sel._ranges[0].collapsed;
                updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], false);
            }
        }
    }

    function addRangeToControlSelection(sel, range) {
        var controlRange = sel.docSelection.createRange();
        var rangeElement = getSingleElementFromRange(range);

        // Create a new ControlRange containing all the elements in the selected ControlRange plus the element
        // contained by the supplied range
        var doc = dom.getDocument(controlRange.item(0));
        var newControlRange = dom.getBody(doc).createControlRange();
        for (var i = 0, len = controlRange.length; i < len; ++i) {
            newControlRange.add(controlRange.item(i));
        }
        try {
            newControlRange.add(rangeElement);
        } catch (ex) {
            throw new Error("addRange(): Element within the specified Range could not be added to control selection (does it have layout?)");
        }
        newControlRange.select();

        // Update the wrapped selection based on what's now in the native selection
        updateControlSelection(sel);
    }

    var getSelectionRangeAt;

    if (util.isHostMethod(testSelection,  "getRangeAt")) {
        getSelectionRangeAt = function(sel, index) {
            try {
                return sel.getRangeAt(index);
            } catch(ex) {
                return null;
            }
        };
    } else if (selectionHasAnchorAndFocus) {
        getSelectionRangeAt = function(sel) {
            var doc = dom.getDocument(sel.anchorNode);
            var range = api.createRange(doc);
            range.setStart(sel.anchorNode, sel.anchorOffset);
            range.setEnd(sel.focusNode, sel.focusOffset);

            // Handle the case when the selection was selected backwards (from the end to the start in the
            // document)
            if (range.collapsed !== this.isCollapsed) {
                range.setStart(sel.focusNode, sel.focusOffset);
                range.setEnd(sel.anchorNode, sel.anchorOffset);
            }

            return range;
        };
    }

    /**
     * @constructor
     */
    function WrappedSelection(selection, docSelection, win) {
        this.nativeSelection = selection;
        this.docSelection = docSelection;
        this._ranges = [];
        this.win = win;
        this.refresh();
    }

    api.getSelection = function(win) {
        win = win || window;
        var sel = win[windowPropertyName];
        var nativeSel = getSelection(win), docSel = implementsDocSelection ? getDocSelection(win) : null;
        if (sel) {
            sel.nativeSelection = nativeSel;
            sel.docSelection = docSel;
            sel.refresh(win);
        } else {
            sel = new WrappedSelection(nativeSel, docSel, win);
            win[windowPropertyName] = sel;
        }
        return sel;
    };

    api.getIframeSelection = function(iframeEl) {
        return api.getSelection(dom.getIframeWindow(iframeEl));
    };

    var selProto = WrappedSelection.prototype;

    function createControlSelection(sel, ranges) {
        // Ensure that the selection becomes of type "Control"
        var doc = dom.getDocument(ranges[0].startContainer);
        var controlRange = dom.getBody(doc).createControlRange();
        for (var i = 0, el; i < rangeCount; ++i) {
            el = getSingleElementFromRange(ranges[i]);
            try {
                controlRange.add(el);
            } catch (ex) {
                throw new Error("setRanges(): Element within the one of the specified Ranges could not be added to control selection (does it have layout?)");
            }
        }
        controlRange.select();

        // Update the wrapped selection based on what's now in the native selection
        updateControlSelection(sel);
    }

    // Selecting a range
    if (!useDocumentSelection && selectionHasAnchorAndFocus && util.areHostMethods(testSelection, ["removeAllRanges", "addRange"])) {
        selProto.removeAllRanges = function() {
            this.nativeSelection.removeAllRanges();
            updateEmptySelection(this);
        };

        var addRangeBackwards = function(sel, range) {
            var doc = DomRange.getRangeDocument(range);
            var endRange = api.createRange(doc);
            endRange.collapseToPoint(range.endContainer, range.endOffset);
            sel.nativeSelection.addRange(getNativeRange(endRange));
            sel.nativeSelection.extend(range.startContainer, range.startOffset);
            sel.refresh();
        };

        if (selectionHasRangeCount) {
            selProto.addRange = function(range, backwards) {
                if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
                    addRangeToControlSelection(this, range);
                } else {
                    if (backwards && selectionHasExtend) {
                        addRangeBackwards(this, range);
                    } else {
                        var previousRangeCount;
                        if (selectionSupportsMultipleRanges) {
                            previousRangeCount = this.rangeCount;
                        } else {
                            this.removeAllRanges();
                            previousRangeCount = 0;
                        }
                        this.nativeSelection.addRange(getNativeRange(range));

                        // Check whether adding the range was successful
                        this.rangeCount = this.nativeSelection.rangeCount;

                        if (this.rangeCount == previousRangeCount + 1) {
                            // The range was added successfully

                            // Check whether the range that we added to the selection is reflected in the last range extracted from
                            // the selection
                            if (api.config.checkSelectionRanges) {
                                var nativeRange = getSelectionRangeAt(this.nativeSelection, this.rangeCount - 1);
                                if (nativeRange && !DomRange.rangesEqual(nativeRange, range)) {
                                    // Happens in WebKit with, for example, a selection placed at the start of a text node
                                    range = new WrappedRange(nativeRange);
                                }
                            }
                            this._ranges[this.rangeCount - 1] = range;
                            updateAnchorAndFocusFromRange(this, range, selectionIsBackwards(this.nativeSelection));
                            this.isCollapsed = selectionIsCollapsed(this);
                        } else {
                            // The range was not added successfully. The simplest thing is to refresh
                            this.refresh();
                        }
                    }
                }
            };
        } else {
            selProto.addRange = function(range, backwards) {
                if (backwards && selectionHasExtend) {
                    addRangeBackwards(this, range);
                } else {
                    this.nativeSelection.addRange(getNativeRange(range));
                    this.refresh();
                }
            };
        }

        selProto.setRanges = function(ranges) {
            if (implementsControlRange && ranges.length > 1) {
                createControlSelection(this, ranges);
            } else {
                this.removeAllRanges();
                for (var i = 0, len = ranges.length; i < len; ++i) {
                    this.addRange(ranges[i]);
                }
            }
        };
    } else if (util.isHostMethod(testSelection, "empty") && util.isHostMethod(testRange, "select") &&
               implementsControlRange && useDocumentSelection) {

        selProto.removeAllRanges = function() {
            // Added try/catch as fix for issue #21
            try {
                this.docSelection.empty();

                // Check for empty() not working (issue #24)
                if (this.docSelection.type != "None") {
                    // Work around failure to empty a control selection by instead selecting a TextRange and then
                    // calling empty()
                    var doc;
                    if (this.anchorNode) {
                        doc = dom.getDocument(this.anchorNode);
                    } else if (this.docSelection.type == CONTROL) {
                        var controlRange = this.docSelection.createRange();
                        if (controlRange.length) {
                            doc = dom.getDocument(controlRange.item(0)).body.createTextRange();
                        }
                    }
                    if (doc) {
                        var textRange = doc.body.createTextRange();
                        textRange.select();
                        this.docSelection.empty();
                    }
                }
            } catch(ex) {}
            updateEmptySelection(this);
        };

        selProto.addRange = function(range) {
            if (this.docSelection.type == CONTROL) {
                addRangeToControlSelection(this, range);
            } else {
                WrappedRange.rangeToTextRange(range).select();
                this._ranges[0] = range;
                this.rangeCount = 1;
                this.isCollapsed = this._ranges[0].collapsed;
                updateAnchorAndFocusFromRange(this, range, false);
            }
        };

        selProto.setRanges = function(ranges) {
            this.removeAllRanges();
            var rangeCount = ranges.length;
            if (rangeCount > 1) {
                createControlSelection(this, ranges);
            } else if (rangeCount) {
                this.addRange(ranges[0]);
            }
        };
    } else {
        module.fail("No means of selecting a Range or TextRange was found");
        return false;
    }

    selProto.getRangeAt = function(index) {
        if (index < 0 || index >= this.rangeCount) {
            throw new DOMException("INDEX_SIZE_ERR");
        } else {
            return this._ranges[index];
        }
    };

    var refreshSelection;

    if (useDocumentSelection) {
        refreshSelection = function(sel) {
            var range;
            if (api.isSelectionValid(sel.win)) {
                range = sel.docSelection.createRange();
            } else {
                range = dom.getBody(sel.win.document).createTextRange();
                range.collapse(true);
            }


            if (sel.docSelection.type == CONTROL) {
                updateControlSelection(sel);
            } else if (isTextRange(range)) {
                updateFromTextRange(sel, range);
            } else {
                updateEmptySelection(sel);
            }
        };
    } else if (util.isHostMethod(testSelection, "getRangeAt") && typeof testSelection.rangeCount == "number") {
        refreshSelection = function(sel) {
            if (implementsControlRange && implementsDocSelection && sel.docSelection.type == CONTROL) {
                updateControlSelection(sel);
            } else {
                sel._ranges.length = sel.rangeCount = sel.nativeSelection.rangeCount;
                if (sel.rangeCount) {
                    for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                        sel._ranges[i] = new api.WrappedRange(sel.nativeSelection.getRangeAt(i));
                    }
                    updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], selectionIsBackwards(sel.nativeSelection));
                    sel.isCollapsed = selectionIsCollapsed(sel);
                } else {
                    updateEmptySelection(sel);
                }
            }
        };
    } else if (selectionHasAnchorAndFocus && typeof testSelection.isCollapsed == BOOLEAN && typeof testRange.collapsed == BOOLEAN && api.features.implementsDomRange) {
        refreshSelection = function(sel) {
            var range, nativeSel = sel.nativeSelection;
            if (nativeSel.anchorNode) {
                range = getSelectionRangeAt(nativeSel, 0);
                sel._ranges = [range];
                sel.rangeCount = 1;
                updateAnchorAndFocusFromNativeSelection(sel);
                sel.isCollapsed = selectionIsCollapsed(sel);
            } else {
                updateEmptySelection(sel);
            }
        };
    } else {
        module.fail("No means of obtaining a Range or TextRange from the user's selection was found");
        return false;
    }

    selProto.refresh = function(checkForChanges) {
        var oldRanges = checkForChanges ? this._ranges.slice(0) : null;
        refreshSelection(this);
        if (checkForChanges) {
            var i = oldRanges.length;
            if (i != this._ranges.length) {
                return false;
            }
            while (i--) {
                if (!DomRange.rangesEqual(oldRanges[i], this._ranges[i])) {
                    return false;
                }
            }
            return true;
        }
    };

    // Removal of a single range
    var removeRangeManually = function(sel, range) {
        var ranges = sel.getAllRanges(), removed = false;
        sel.removeAllRanges();
        for (var i = 0, len = ranges.length; i < len; ++i) {
            if (removed || range !== ranges[i]) {
                sel.addRange(ranges[i]);
            } else {
                // According to the draft WHATWG Range spec, the same range may be added to the selection multiple
                // times. removeRange should only remove the first instance, so the following ensures only the first
                // instance is removed
                removed = true;
            }
        }
        if (!sel.rangeCount) {
            updateEmptySelection(sel);
        }
    };

    if (implementsControlRange) {
        selProto.removeRange = function(range) {
            if (this.docSelection.type == CONTROL) {
                var controlRange = this.docSelection.createRange();
                var rangeElement = getSingleElementFromRange(range);

                // Create a new ControlRange containing all the elements in the selected ControlRange minus the
                // element contained by the supplied range
                var doc = dom.getDocument(controlRange.item(0));
                var newControlRange = dom.getBody(doc).createControlRange();
                var el, removed = false;
                for (var i = 0, len = controlRange.length; i < len; ++i) {
                    el = controlRange.item(i);
                    if (el !== rangeElement || removed) {
                        newControlRange.add(controlRange.item(i));
                    } else {
                        removed = true;
                    }
                }
                newControlRange.select();

                // Update the wrapped selection based on what's now in the native selection
                updateControlSelection(this);
            } else {
                removeRangeManually(this, range);
            }
        };
    } else {
        selProto.removeRange = function(range) {
            removeRangeManually(this, range);
        };
    }

    // Detecting if a selection is backwards
    var selectionIsBackwards;
    if (!useDocumentSelection && selectionHasAnchorAndFocus && api.features.implementsDomRange) {
        selectionIsBackwards = function(sel) {
            var backwards = false;
            if (sel.anchorNode) {
                backwards = (dom.comparePoints(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset) == 1);
            }
            return backwards;
        };

        selProto.isBackwards = function() {
            return selectionIsBackwards(this);
        };
    } else {
        selectionIsBackwards = selProto.isBackwards = function() {
            return false;
        };
    }

    // Selection text
    // This is conformant to the new WHATWG DOM Range draft spec but differs from WebKit and Mozilla's implementation
    selProto.toString = function() {

        var rangeTexts = [];
        for (var i = 0, len = this.rangeCount; i < len; ++i) {
            rangeTexts[i] = "" + this._ranges[i];
        }
        return rangeTexts.join("");
    };

    function assertNodeInSameDocument(sel, node) {
        if (sel.anchorNode && (dom.getDocument(sel.anchorNode) !== dom.getDocument(node))) {
            throw new DOMException("WRONG_DOCUMENT_ERR");
        }
    }

    // No current browsers conform fully to the HTML 5 draft spec for this method, so Rangy's own method is always used
    selProto.collapse = function(node, offset) {
        assertNodeInSameDocument(this, node);
        var range = api.createRange(dom.getDocument(node));
        range.collapseToPoint(node, offset);
        this.removeAllRanges();
        this.addRange(range);
        this.isCollapsed = true;
    };

    selProto.collapseToStart = function() {
        if (this.rangeCount) {
            var range = this._ranges[0];
            this.collapse(range.startContainer, range.startOffset);
        } else {
            throw new DOMException("INVALID_STATE_ERR");
        }
    };

    selProto.collapseToEnd = function() {
        if (this.rangeCount) {
            var range = this._ranges[this.rangeCount - 1];
            this.collapse(range.endContainer, range.endOffset);
        } else {
            throw new DOMException("INVALID_STATE_ERR");
        }
    };

    // The HTML 5 spec is very specific on how selectAllChildren should be implemented so the native implementation is
    // never used by Rangy.
    selProto.selectAllChildren = function(node) {
        assertNodeInSameDocument(this, node);
        var range = api.createRange(dom.getDocument(node));
        range.selectNodeContents(node);
        this.removeAllRanges();
        this.addRange(range);
    };

    selProto.deleteFromDocument = function() {
        // Sepcial behaviour required for Control selections
        if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
            var controlRange = this.docSelection.createRange();
            var element;
            while (controlRange.length) {
                element = controlRange.item(0);
                controlRange.remove(element);
                element.parentNode.removeChild(element);
            }
            this.refresh();
        } else if (this.rangeCount) {
            var ranges = this.getAllRanges();
            this.removeAllRanges();
            for (var i = 0, len = ranges.length; i < len; ++i) {
                ranges[i].deleteContents();
            }
            // The HTML5 spec says nothing about what the selection should contain after calling deleteContents on each
            // range. Firefox moves the selection to where the final selected range was, so we emulate that
            this.addRange(ranges[len - 1]);
        }
    };

    // The following are non-standard extensions
    selProto.getAllRanges = function() {
        return this._ranges.slice(0);
    };

    selProto.setSingleRange = function(range) {
        this.setRanges( [range] );
    };

    selProto.containsNode = function(node, allowPartial) {
        for (var i = 0, len = this._ranges.length; i < len; ++i) {
            if (this._ranges[i].containsNode(node, allowPartial)) {
                return true;
            }
        }
        return false;
    };

    selProto.toHtml = function() {
        var html = "";
        if (this.rangeCount) {
            var container = DomRange.getRangeDocument(this._ranges[0]).createElement("div");
            for (var i = 0, len = this._ranges.length; i < len; ++i) {
                container.appendChild(this._ranges[i].cloneContents());
            }
            html = container.innerHTML;
        }
        return html;
    };

    function inspect(sel) {
        var rangeInspects = [];
        var anchor = new DomPosition(sel.anchorNode, sel.anchorOffset);
        var focus = new DomPosition(sel.focusNode, sel.focusOffset);
        var name = (typeof sel.getName == "function") ? sel.getName() : "Selection";

        if (typeof sel.rangeCount != "undefined") {
            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                rangeInspects[i] = DomRange.inspect(sel.getRangeAt(i));
            }
        }
        return "[" + name + "(Ranges: " + rangeInspects.join(", ") +
                ")(anchor: " + anchor.inspect() + ", focus: " + focus.inspect() + "]";

    }

    selProto.getName = function() {
        return "WrappedSelection";
    };

    selProto.inspect = function() {
        return inspect(this);
    };

    selProto.detach = function() {
        this.win[windowPropertyName] = null;
        this.win = this.anchorNode = this.focusNode = null;
    };

    WrappedSelection.inspect = inspect;

    api.Selection = WrappedSelection;

    api.selectionPrototype = selProto;

    api.addCreateMissingNativeApiListener(function(win) {
        if (typeof win.getSelection == "undefined") {
            win.getSelection = function() {
                return api.getSelection(this);
            };
        }
        win = null;
    });
});
/**
 * @license CSS Class Applier module for Rangy.
 * Adds, removes and toggles CSS classes on Ranges and Selections
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Depends on Rangy core.
 *
 * Copyright 2012, Tim Down
 * Licensed under the MIT license.
 * Version: 1.2.3
 * Build date: 26 February 2012
 */
rangy.createModule("CssClassApplier", function(api, module) {
    api.requireModules( ["WrappedSelection", "WrappedRange"] );

    var dom = api.dom;



    var defaultTagName = "span";

    function trim(str) {
        return str.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
    }

    function hasClass(el, cssClass) {
        return el.className && new RegExp("(?:^|\\s)" + cssClass + "(?:\\s|$)").test(el.className);
    }

    function addClass(el, cssClass) {
        if (el.className) {
            if (!hasClass(el, cssClass)) {
                el.className += " " + cssClass;
            }
        } else {
            el.className = cssClass;
        }
    }

    var removeClass = (function() {
        function replacer(matched, whiteSpaceBefore, whiteSpaceAfter) {
            return (whiteSpaceBefore && whiteSpaceAfter) ? " " : "";
        }

        return function(el, cssClass) {
            if (el.className) {
                el.className = el.className.replace(new RegExp("(?:^|\\s)" + cssClass + "(?:\\s|$)"), replacer);
            }
        };
    })();

    function sortClassName(className) {
        return className.split(/\s+/).sort().join(" ");
    }

    function getSortedClassName(el) {
        return sortClassName(el.className);
    }

    function haveSameClasses(el1, el2) {
        return getSortedClassName(el1) == getSortedClassName(el2);
    }

    function replaceWithOwnChildren(el) {

        var parent = el.parentNode;
        while (el.hasChildNodes()) {
            parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
    }

    function rangeSelectsAnyText(range, textNode) {
        var textRange = range.cloneRange();
        textRange.selectNodeContents(textNode);

        var intersectionRange = textRange.intersection(range);
        var text = intersectionRange ? intersectionRange.toString() : "";
        textRange.detach();

        return text != "";
    }

    function getEffectiveTextNodes(range) {
        return range.getNodes([3], function(textNode) {
            return rangeSelectsAnyText(range, textNode);
        });
    }

    function elementsHaveSameNonClassAttributes(el1, el2) {
        if (el1.attributes.length != el2.attributes.length) return false;
        for (var i = 0, len = el1.attributes.length, attr1, attr2, name; i < len; ++i) {
            attr1 = el1.attributes[i];
            name = attr1.name;
            if (name != "class") {
                attr2 = el2.attributes.getNamedItem(name);
                if (attr1.specified != attr2.specified) return false;
                if (attr1.specified && attr1.nodeValue !== attr2.nodeValue) return false;
            }
        }
        return true;
    }

    function elementHasNonClassAttributes(el, exceptions) {
        for (var i = 0, len = el.attributes.length, attrName; i < len; ++i) {
            attrName = el.attributes[i].name;
            if ( !(exceptions && dom.arrayContains(exceptions, attrName)) && el.attributes[i].specified && attrName != "class") {
                return true;
            }
        }
        return false;
    }

    function elementHasProps(el, props) {
        for (var p in props) {
            if (props.hasOwnProperty(p) && el[p] !== props[p]) {
                return false;
            }
        }
        return true;
    }

    var getComputedStyleProperty;

    if (typeof window.getComputedStyle != "undefined") {
        getComputedStyleProperty = function(el, propName) {
            return dom.getWindow(el).getComputedStyle(el, null)[propName];
        };
    } else if (typeof document.documentElement.currentStyle != "undefined") {
        getComputedStyleProperty = function(el, propName) {
            return el.currentStyle[propName];
        };
    } else {
        module.fail("No means of obtaining computed style properties found");
    }

    var isEditableElement;

    (function() {
        var testEl = document.createElement("div");
        if (typeof testEl.isContentEditable == "boolean") {
            isEditableElement = function(node) {
                return node && node.nodeType == 1 && node.isContentEditable;
            };
        } else {
            isEditableElement = function(node) {
                if (!node || node.nodeType != 1 || node.contentEditable == "false") {
                    return false;
                }
                return node.contentEditable == "true" || isEditableElement(node.parentNode);
            };
        }
    })();

    function isEditingHost(node) {
        var parent;
        return node && node.nodeType == 1
            && (( (parent = node.parentNode) && parent.nodeType == 9 && parent.designMode == "on")
            || (isEditableElement(node) && !isEditableElement(node.parentNode)));
    }

    function isEditable(node) {
        return (isEditableElement(node) || (node.nodeType != 1 && isEditableElement(node.parentNode))) && !isEditingHost(node);
    }

    var inlineDisplayRegex = /^inline(-block|-table)?$/i;

    function isNonInlineElement(node) {
        return node && node.nodeType == 1 && !inlineDisplayRegex.test(getComputedStyleProperty(node, "display"));
    }

    // White space characters as defined by HTML 4 (http://www.w3.org/TR/html401/struct/text.html)
    var htmlNonWhiteSpaceRegex = /[^\r\n\t\f \u200B]/;

    function isUnrenderedWhiteSpaceNode(node) {
        if (node.data.length == 0) {
            return true;
        }
        if (htmlNonWhiteSpaceRegex.test(node.data)) {
            return false;
        }
        var cssWhiteSpace = getComputedStyleProperty(node.parentNode, "whiteSpace");
        switch (cssWhiteSpace) {
            case "pre":
            case "pre-wrap":
            case "-moz-pre-wrap":
                return false;
            case "pre-line":
                if (/[\r\n]/.test(node.data)) {
                    return false;
                }
        }

        // We now have a whitespace-only text node that may be rendered depending on its context. If it is adjacent to a
        // non-inline element, it will not be rendered. This seems to be a good enough definition.
        return isNonInlineElement(node.previousSibling) || isNonInlineElement(node.nextSibling);
    }

    function isSplitPoint(node, offset) {
        if (dom.isCharacterDataNode(node)) {
            if (offset == 0) {
                return !!node.previousSibling;
            } else if (offset == node.length) {
                return !!node.nextSibling;
            } else {
                return true;
            }
        }

        return offset > 0 && offset < node.childNodes.length;
    }

    function splitNodeAt(node, descendantNode, descendantOffset, rangesToPreserve) {
        var newNode;
        var splitAtStart = (descendantOffset == 0);

        if (dom.isAncestorOf(descendantNode, node)) {

            return node;
        }

        if (dom.isCharacterDataNode(descendantNode)) {
            if (descendantOffset == 0) {
                descendantOffset = dom.getNodeIndex(descendantNode);
                descendantNode = descendantNode.parentNode;
            } else if (descendantOffset == descendantNode.length) {
                descendantOffset = dom.getNodeIndex(descendantNode) + 1;
                descendantNode = descendantNode.parentNode;
            } else {
                throw module.createError("splitNodeAt should not be called with offset in the middle of a data node ("
                    + descendantOffset + " in " + descendantNode.data);
            }
        }

        if (isSplitPoint(descendantNode, descendantOffset)) {
            if (!newNode) {
                newNode = descendantNode.cloneNode(false);
                if (newNode.id) {
                    newNode.removeAttribute("id");
                }
                var child;
                while ((child = descendantNode.childNodes[descendantOffset])) {
                    newNode.appendChild(child);
                }
                dom.insertAfter(newNode, descendantNode);
            }
            return (descendantNode == node) ? newNode : splitNodeAt(node, newNode.parentNode, dom.getNodeIndex(newNode), rangesToPreserve);
        } else if (node != descendantNode) {
            newNode = descendantNode.parentNode;

            // Work out a new split point in the parent node
            var newNodeIndex = dom.getNodeIndex(descendantNode);

            if (!splitAtStart) {
                newNodeIndex++;
            }
            return splitNodeAt(node, newNode, newNodeIndex, rangesToPreserve);
        }
        return node;
    }

    function areElementsMergeable(el1, el2) {
        return el1.tagName == el2.tagName && haveSameClasses(el1, el2) && elementsHaveSameNonClassAttributes(el1, el2);
    }

    function createAdjacentMergeableTextNodeGetter(forward) {
        var propName = forward ? "nextSibling" : "previousSibling";

        return function(textNode, checkParentElement) {
            var el = textNode.parentNode;
            var adjacentNode = textNode[propName];
            if (adjacentNode) {
                // Can merge if the node's previous/next sibling is a text node
                if (adjacentNode && adjacentNode.nodeType == 3) {
                    return adjacentNode;
                }
            } else if (checkParentElement) {
                // Compare text node parent element with its sibling
                adjacentNode = el[propName];

                if (adjacentNode && adjacentNode.nodeType == 1 && areElementsMergeable(el, adjacentNode)) {
                    return adjacentNode[forward ? "firstChild" : "lastChild"];
                }
            }
            return null;
        }
    }

    var getPreviousMergeableTextNode = createAdjacentMergeableTextNodeGetter(false),
        getNextMergeableTextNode = createAdjacentMergeableTextNodeGetter(true);


    function Merge(firstNode) {
        this.isElementMerge = (firstNode.nodeType == 1);
        this.firstTextNode = this.isElementMerge ? firstNode.lastChild : firstNode;
        this.textNodes = [this.firstTextNode];
    }

    Merge.prototype = {
        doMerge: function() {
            var textBits = [], textNode, parent, text;
            for (var i = 0, len = this.textNodes.length; i < len; ++i) {
                textNode = this.textNodes[i];
                parent = textNode.parentNode;
                textBits[i] = textNode.data;
                if (i) {
                    parent.removeChild(textNode);
                    if (!parent.hasChildNodes()) {
                        parent.parentNode.removeChild(parent);
                    }
                }
            }
            this.firstTextNode.data = text = textBits.join("");
            return text;
        },

        getLength: function() {
            var i = this.textNodes.length, len = 0;
            while (i--) {
                len += this.textNodes[i].length;
            }
            return len;
        },

        toString: function() {
            var textBits = [];
            for (var i = 0, len = this.textNodes.length; i < len; ++i) {
                textBits[i] = "'" + this.textNodes[i].data + "'";
            }
            return "[Merge(" + textBits.join(",") + ")]";
        }
    };

    var optionProperties = ["elementTagName", "ignoreWhiteSpace", "applyToEditableOnly"];

    // Allow "class" as a property name in object properties
    var mappedPropertyNames = {"class" : "className"};

    function CssClassApplier(cssClass, options, tagNames) {
        this.cssClass = cssClass;
        var normalize, i, len, propName;

        var elementPropertiesFromOptions = null;

        // Initialize from options object
        if (typeof options == "object" && options !== null) {
            tagNames = options.tagNames;
            elementPropertiesFromOptions = options.elementProperties;

            for (i = 0; propName = optionProperties[i++]; ) {
                if (options.hasOwnProperty(propName)) {
                    this[propName] = options[propName];
                }
            }
            normalize = options.normalize;
        } else {
            normalize = options;
        }

        // Backwards compatibility: the second parameter can also be a Boolean indicating whether normalization
        this.normalize = (typeof normalize == "undefined") ? true : normalize;

        // Initialize element properties and attribute exceptions
        this.attrExceptions = [];
        var el = document.createElement(this.elementTagName);
        this.elementProperties = {};
        for (var p in elementPropertiesFromOptions) {
            if (elementPropertiesFromOptions.hasOwnProperty(p)) {
                // Map "class" to "className"
                if (mappedPropertyNames.hasOwnProperty(p)) {
                    p = mappedPropertyNames[p];
                }
                el[p] = elementPropertiesFromOptions[p];

                // Copy the property back from the dummy element so that later comparisons to check whether elements
                // may be removed are checking against the right value. For example, the href property of an element
                // returns a fully qualified URL even if it was previously assigned a relative URL.
                this.elementProperties[p] = el[p];
                this.attrExceptions.push(p);
            }
        }

        this.elementSortedClassName = this.elementProperties.hasOwnProperty("className") ?
            sortClassName(this.elementProperties.className + " " + cssClass) : cssClass;

        // Initialize tag names
        this.applyToAnyTagName = false;
        var type = typeof tagNames;
        if (type == "string") {
            if (tagNames == "*") {
                this.applyToAnyTagName = true;
            } else {
                this.tagNames = trim(tagNames.toLowerCase()).split(/\s*,\s*/);
            }
        } else if (type == "object" && typeof tagNames.length == "number") {
            this.tagNames = [];
            for (i = 0, len = tagNames.length; i < len; ++i) {
                if (tagNames[i] == "*") {
                    this.applyToAnyTagName = true;
                } else {
                    this.tagNames.push(tagNames[i].toLowerCase());
                }
            }
        } else {
            this.tagNames = [this.elementTagName];
        }
    }

    CssClassApplier.prototype = {
        elementTagName: defaultTagName,
        elementProperties: {},
        ignoreWhiteSpace: true,
        applyToEditableOnly: false,

        hasClass: function(node) {
            return node.nodeType == 1 && dom.arrayContains(this.tagNames, node.tagName.toLowerCase()) && hasClass(node, this.cssClass);
        },

        getSelfOrAncestorWithClass: function(node) {
            while (node) {
                if (this.hasClass(node, this.cssClass)) {
                    return node;
                }
                node = node.parentNode;
            }
            return null;
        },

        isModifiable: function(node) {
            return !this.applyToEditableOnly || isEditable(node);
        },

        // White space adjacent to an unwrappable node can be ignored for wrapping
        isIgnorableWhiteSpaceNode: function(node) {
            return this.ignoreWhiteSpace && node && node.nodeType == 3 && isUnrenderedWhiteSpaceNode(node);
        },

        // Normalizes nodes after applying a CSS class to a Range.
        postApply: function(textNodes, range, isUndo) {

            var firstNode = textNodes[0], lastNode = textNodes[textNodes.length - 1];

            var merges = [], currentMerge;

            var rangeStartNode = firstNode, rangeEndNode = lastNode;
            var rangeStartOffset = 0, rangeEndOffset = lastNode.length;

            var textNode, precedingTextNode;

            for (var i = 0, len = textNodes.length; i < len; ++i) {
                textNode = textNodes[i];
                precedingTextNode = getPreviousMergeableTextNode(textNode, !isUndo);

                if (precedingTextNode) {
                    if (!currentMerge) {
                        currentMerge = new Merge(precedingTextNode);
                        merges.push(currentMerge);
                    }
                    currentMerge.textNodes.push(textNode);
                    if (textNode === firstNode) {
                        rangeStartNode = currentMerge.firstTextNode;
                        rangeStartOffset = rangeStartNode.length;
                    }
                    if (textNode === lastNode) {
                        rangeEndNode = currentMerge.firstTextNode;
                        rangeEndOffset = currentMerge.getLength();
                    }
                } else {
                    currentMerge = null;
                }
            }

            // Test whether the first node after the range needs merging
            var nextTextNode = getNextMergeableTextNode(lastNode, !isUndo);

            if (nextTextNode) {
                if (!currentMerge) {
                    currentMerge = new Merge(lastNode);
                    merges.push(currentMerge);
                }
                currentMerge.textNodes.push(nextTextNode);
            }

            // Do the merges
            if (merges.length) {

                for (i = 0, len = merges.length; i < len; ++i) {
                    merges[i].doMerge();
                }


                // Set the range boundaries
                range.setStart(rangeStartNode, rangeStartOffset);
                range.setEnd(rangeEndNode, rangeEndOffset);
            }

        },

        createContainer: function(doc) {
            var el = doc.createElement(this.elementTagName);
            api.util.extend(el, this.elementProperties);
            addClass(el, this.cssClass);
            return el;
        },

        applyToTextNode: function(textNode) {


            var parent = textNode.parentNode;
            if (parent.childNodes.length == 1 && dom.arrayContains(this.tagNames, parent.tagName.toLowerCase())) {
                addClass(parent, this.cssClass);
            } else {
                var el = this.createContainer(dom.getDocument(textNode));
                textNode.parentNode.insertBefore(el, textNode);
                el.appendChild(textNode);
            }

        },

        isRemovable: function(el) {
            return el.tagName.toLowerCase() == this.elementTagName
                    && getSortedClassName(el) == this.elementSortedClassName
                    && elementHasProps(el, this.elementProperties)
                    && !elementHasNonClassAttributes(el, this.attrExceptions)
                    && this.isModifiable(el);
        },

        undoToTextNode: function(textNode, range, ancestorWithClass) {

            if (!range.containsNode(ancestorWithClass)) {
                // Split out the portion of the ancestor from which we can remove the CSS class
                //var parent = ancestorWithClass.parentNode, index = dom.getNodeIndex(ancestorWithClass);
                var ancestorRange = range.cloneRange();
                ancestorRange.selectNode(ancestorWithClass);

                if (ancestorRange.isPointInRange(range.endContainer, range.endOffset)/* && isSplitPoint(range.endContainer, range.endOffset)*/) {
                    splitNodeAt(ancestorWithClass, range.endContainer, range.endOffset, [range]);
                    range.setEndAfter(ancestorWithClass);
                }
                if (ancestorRange.isPointInRange(range.startContainer, range.startOffset)/* && isSplitPoint(range.startContainer, range.startOffset)*/) {
                    ancestorWithClass = splitNodeAt(ancestorWithClass, range.startContainer, range.startOffset, [range]);
                }
            }

            if (this.isRemovable(ancestorWithClass)) {
                replaceWithOwnChildren(ancestorWithClass);
            } else {
                removeClass(ancestorWithClass, this.cssClass);
            }
        },

        applyToRange: function(range) {
            range.splitBoundaries();
            var textNodes = getEffectiveTextNodes(range);

            if (textNodes.length) {
                var textNode;

                for (var i = 0, len = textNodes.length; i < len; ++i) {
                    textNode = textNodes[i];

                    if (!this.isIgnorableWhiteSpaceNode(textNode) && !this.getSelfOrAncestorWithClass(textNode)
                            && this.isModifiable(textNode)) {
                        this.applyToTextNode(textNode);
                    }
                }
                range.setStart(textNodes[0], 0);
                textNode = textNodes[textNodes.length - 1];
                range.setEnd(textNode, textNode.length);
                if (this.normalize) {
                    this.postApply(textNodes, range, false);
                }
            }
        },

        applyToSelection: function(win) {

            win = win || window;
            var sel = api.getSelection(win);

            var range, ranges = sel.getAllRanges();
            sel.removeAllRanges();
            var i = ranges.length;
            while (i--) {
                range = ranges[i];
                this.applyToRange(range);
                sel.addRange(range);
            }

        },

        undoToRange: function(range) {

            range.splitBoundaries();
            var textNodes = getEffectiveTextNodes(range);
            var textNode, ancestorWithClass;
            var lastTextNode = textNodes[textNodes.length - 1];

            if (textNodes.length) {
                for (var i = 0, len = textNodes.length; i < len; ++i) {
                    textNode = textNodes[i];
                    ancestorWithClass = this.getSelfOrAncestorWithClass(textNode);
                    if (ancestorWithClass && this.isModifiable(textNode)) {
                        this.undoToTextNode(textNode, range, ancestorWithClass);
                    }

                    // Ensure the range is still valid
                    range.setStart(textNodes[0], 0);
                    range.setEnd(lastTextNode, lastTextNode.length);
                }



                if (this.normalize) {
                    this.postApply(textNodes, range, true);
                }
            }
        },

        undoToSelection: function(win) {
            win = win || window;
            var sel = api.getSelection(win);
            var ranges = sel.getAllRanges(), range;
            sel.removeAllRanges();
            for (var i = 0, len = ranges.length; i < len; ++i) {
                range = ranges[i];
                this.undoToRange(range);
                sel.addRange(range);
            }
        },

        getTextSelectedByRange: function(textNode, range) {
            var textRange = range.cloneRange();
            textRange.selectNodeContents(textNode);

            var intersectionRange = textRange.intersection(range);
            var text = intersectionRange ? intersectionRange.toString() : "";
            textRange.detach();

            return text;
        },

        isAppliedToRange: function(range) {
            if (range.collapsed) {
                return !!this.getSelfOrAncestorWithClass(range.commonAncestorContainer);
            } else {
                var textNodes = range.getNodes( [3] );
                for (var i = 0, textNode; textNode = textNodes[i++]; ) {
                    if (!this.isIgnorableWhiteSpaceNode(textNode) && rangeSelectsAnyText(range, textNode)
                            && this.isModifiable(textNode) && !this.getSelfOrAncestorWithClass(textNode)) {
                        return false;
                    }
                }
                return true;
            }
        },

        isAppliedToSelection: function(win) {
            win = win || window;
            var sel = api.getSelection(win);
            var ranges = sel.getAllRanges();
            var i = ranges.length;
            while (i--) {
                if (!this.isAppliedToRange(ranges[i])) {
                    return false;
                }
            }

            return true;
        },

        toggleRange: function(range) {
            if (this.isAppliedToRange(range)) {
                this.undoToRange(range);
            } else {
                this.applyToRange(range);
            }
        },

        toggleSelection: function(win) {
            if (this.isAppliedToSelection(win)) {
                this.undoToSelection(win);
            } else {
                this.applyToSelection(win);
            }
        },

        detach: function() {}
    };

    function createCssClassApplier(cssClass, options, tagNames) {
        return new CssClassApplier(cssClass, options, tagNames);
    }

    CssClassApplier.util = {
        hasClass: hasClass,
        addClass: addClass,
        removeClass: removeClass,
        hasSameClasses: haveSameClasses,
        replaceWithOwnChildren: replaceWithOwnChildren,
        elementsHaveSameNonClassAttributes: elementsHaveSameNonClassAttributes,
        elementHasNonClassAttributes: elementHasNonClassAttributes,
        splitNodeAt: splitNodeAt,
        isEditableElement: isEditableElement,
        isEditingHost: isEditingHost,
        isEditable: isEditable
    };

    api.CssClassApplier = CssClassApplier;
    api.createCssClassApplier = createCssClassApplier;
});
/**
 * @license Selection save and restore module for Rangy.
 * Saves and restores user selections using marker invisible elements in the DOM.
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Depends on Rangy core.
 *
 * Copyright 2012, Tim Down
 * Licensed under the MIT license.
 * Version: 1.2.3
 * Build date: 26 February 2012
 */
rangy.createModule("SaveRestore", function(api, module) {
    api.requireModules( ["DomUtil", "DomRange", "WrappedRange"] );

    var dom = api.dom;

    var markerTextChar = "\ufeff";

    function gEBI(id, doc) {
        return (doc || document).getElementById(id);
    }

    function insertRangeBoundaryMarker(range, atStart) {
        var markerId = "selectionBoundary_" + (+new Date()) + "_" + ("" + Math.random()).slice(2);
        var markerEl;
        var doc = dom.getDocument(range.startContainer);

        // Clone the Range and collapse to the appropriate boundary point
        var boundaryRange = range.cloneRange();
        boundaryRange.collapse(atStart);

        // Create the marker element containing a single invisible character using DOM methods and insert it
        markerEl = doc.createElement("span");
        markerEl.id = markerId;
        markerEl.style.lineHeight = "0";
        markerEl.style.display = "none";
        markerEl.className = "rangySelectionBoundary";
        markerEl.appendChild(doc.createTextNode(markerTextChar));

        boundaryRange.insertNode(markerEl);
        boundaryRange.detach();
        return markerEl;
    }

    function setRangeBoundary(doc, range, markerId, atStart) {
        var markerEl = gEBI(markerId, doc);
        if (markerEl) {
            range[atStart ? "setStartBefore" : "setEndBefore"](markerEl);
            markerEl.parentNode.removeChild(markerEl);
        } else {
            module.warn("Marker element has been removed. Cannot restore selection.");
        }
    }

    function compareRanges(r1, r2) {
        return r2.compareBoundaryPoints(r1.START_TO_START, r1);
    }

    function saveSelection(win) {
        win = win || window;
        var doc = win.document;
        if (!api.isSelectionValid(win)) {
            module.warn("Cannot save selection. This usually happens when the selection is collapsed and the selection document has lost focus.");
            return;
        }
        var sel = api.getSelection(win);
        var ranges = sel.getAllRanges();
        var rangeInfos = [], startEl, endEl, range;

        // Order the ranges by position within the DOM, latest first
        ranges.sort(compareRanges);

        for (var i = 0, len = ranges.length; i < len; ++i) {
            range = ranges[i];
            if (range.collapsed) {
                endEl = insertRangeBoundaryMarker(range, false);
                rangeInfos.push({
                    markerId: endEl.id,
                    collapsed: true
                });
            } else {
                endEl = insertRangeBoundaryMarker(range, false);
                startEl = insertRangeBoundaryMarker(range, true);

                rangeInfos[i] = {
                    startMarkerId: startEl.id,
                    endMarkerId: endEl.id,
                    collapsed: false,
                    backwards: ranges.length == 1 && sel.isBackwards()
                };
            }
        }

        // Now that all the markers are in place and DOM manipulation over, adjust each range's boundaries to lie
        // between its markers
        for (i = len - 1; i >= 0; --i) {
            range = ranges[i];
            if (range.collapsed) {
                range.collapseBefore(gEBI(rangeInfos[i].markerId, doc));
            } else {
                range.setEndBefore(gEBI(rangeInfos[i].endMarkerId, doc));
                range.setStartAfter(gEBI(rangeInfos[i].startMarkerId, doc));
            }
        }

        // Ensure current selection is unaffected
        sel.setRanges(ranges);
        return {
            win: win,
            doc: doc,
            rangeInfos: rangeInfos,
            restored: false
        };
    }

    function restoreSelection(savedSelection, preserveDirection) {
        if (!savedSelection.restored) {
            var rangeInfos = savedSelection.rangeInfos;
            var sel = api.getSelection(savedSelection.win);
            var ranges = [];

            // Ranges are in reverse order of appearance in the DOM. We want to restore earliest first to avoid
            // normalization affecting previously restored ranges.
            for (var len = rangeInfos.length, i = len - 1, rangeInfo, range; i >= 0; --i) {
                rangeInfo = rangeInfos[i];
                range = api.createRange(savedSelection.doc);
                if (rangeInfo.collapsed) {
                    var markerEl = gEBI(rangeInfo.markerId, savedSelection.doc);
                    if (markerEl) {
                        markerEl.style.display = "inline";
                        var previousNode = markerEl.previousSibling;

                        // Workaround for issue 17
                        if (previousNode && previousNode.nodeType == 3) {
                            markerEl.parentNode.removeChild(markerEl);
                            range.collapseToPoint(previousNode, previousNode.length);
                        } else {
                            range.collapseBefore(markerEl);
                            markerEl.parentNode.removeChild(markerEl);
                        }
                    } else {
                        module.warn("Marker element has been removed. Cannot restore selection.");
                    }
                } else {
                    setRangeBoundary(savedSelection.doc, range, rangeInfo.startMarkerId, true);
                    setRangeBoundary(savedSelection.doc, range, rangeInfo.endMarkerId, false);
                }

                // Normalizing range boundaries is only viable if the selection contains only one range. For example,
                // if the selection contained two ranges that were both contained within the same single text node,
                // both would alter the same text node when restoring and break the other range.
                if (len == 1) {
                    range.normalizeBoundaries();
                }
                ranges[i] = range;
            }
            if (len == 1 && preserveDirection && api.features.selectionHasExtend && rangeInfos[0].backwards) {
                sel.removeAllRanges();
                sel.addRange(ranges[0], true);
            } else {
                sel.setRanges(ranges);
            }

            savedSelection.restored = true;
        }
    }

    function removeMarkerElement(doc, markerId) {
        var markerEl = gEBI(markerId, doc);
        if (markerEl) {
            markerEl.parentNode.removeChild(markerEl);
        }
    }

    function removeMarkers(savedSelection) {
        var rangeInfos = savedSelection.rangeInfos;
        for (var i = 0, len = rangeInfos.length, rangeInfo; i < len; ++i) {
            rangeInfo = rangeInfos[i];
            if (rangeInfo.collapsed) {
                removeMarkerElement(savedSelection.doc, rangeInfo.markerId);
            } else {
                removeMarkerElement(savedSelection.doc, rangeInfo.startMarkerId);
                removeMarkerElement(savedSelection.doc, rangeInfo.endMarkerId);
            }
        }
    }

    api.saveSelection = saveSelection;
    api.restoreSelection = restoreSelection;
    api.removeMarkerElement = removeMarkerElement;
    api.removeMarkers = removeMarkers;
});
/**
 * @license Serializer module for Rangy.
 * Serializes Ranges and Selections. An example use would be to store a user's selection on a particular page in a
 * cookie or local storage and restore it on the user's next visit to the same page.
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Depends on Rangy core.
 *
 * Copyright 2012, Tim Down
 * Licensed under the MIT license.
 * Version: 1.2.3
 * Build date: 26 February 2012
 */
rangy.createModule("Serializer", function(api, module) {
    api.requireModules( ["WrappedSelection", "WrappedRange"] );
    var UNDEF = "undefined";

    // encodeURIComponent and decodeURIComponent are required for cookie handling
    if (typeof encodeURIComponent == UNDEF || typeof decodeURIComponent == UNDEF) {
        module.fail("Global object is missing encodeURIComponent and/or decodeURIComponent method");
    }

    // Checksum for checking whether range can be serialized
    var crc32 = (function() {
        function utf8encode(str) {
            var utf8CharCodes = [];

            for (var i = 0, len = str.length, c; i < len; ++i) {
                c = str.charCodeAt(i);
                if (c < 128) {
                    utf8CharCodes.push(c);
                } else if (c < 2048) {
                    utf8CharCodes.push((c >> 6) | 192, (c & 63) | 128);
                } else {
                    utf8CharCodes.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
                }
            }
            return utf8CharCodes;
        }

        var cachedCrcTable = null;

        function buildCRCTable() {
            var table = [];
            for (var i = 0, j, crc; i < 256; ++i) {
                crc = i;
                j = 8;
                while (j--) {
                    if ((crc & 1) == 1) {
                        crc = (crc >>> 1) ^ 0xEDB88320;
                    } else {
                        crc >>>= 1;
                    }
                }
                table[i] = crc >>> 0;
            }
            return table;
        }

        function getCrcTable() {
            if (!cachedCrcTable) {
                cachedCrcTable = buildCRCTable();
            }
            return cachedCrcTable;
        }

        return function(str) {
            var utf8CharCodes = utf8encode(str), crc = -1, crcTable = getCrcTable();
            for (var i = 0, len = utf8CharCodes.length, y; i < len; ++i) {
                y = (crc ^ utf8CharCodes[i]) & 0xFF;
                crc = (crc >>> 8) ^ crcTable[y];
            }
            return (crc ^ -1) >>> 0;
        };
    })();

    var dom = api.dom;

    function escapeTextForHtml(str) {
        return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function nodeToInfoString(node, infoParts) {
        infoParts = infoParts || [];
        var nodeType = node.nodeType, children = node.childNodes, childCount = children.length;
        var nodeInfo = [nodeType, node.nodeName, childCount].join(":");
        var start = "", end = "";
        switch (nodeType) {
            case 3: // Text node
                start = escapeTextForHtml(node.nodeValue);
                break;
            case 8: // Comment
                start = "<!--" + escapeTextForHtml(node.nodeValue) + "-->";
                break;
            default:
                start = "<" + nodeInfo + ">";
                end = "</>";
                break;
        }
        if (start) {
            infoParts.push(start);
        }
        for (var i = 0; i < childCount; ++i) {
            nodeToInfoString(children[i], infoParts);
        }
        if (end) {
            infoParts.push(end);
        }
        return infoParts;
    }

    // Creates a string representation of the specified element's contents that is similar to innerHTML but omits all
    // attributes and comments and includes child node counts. This is done instead of using innerHTML to work around
    // IE <= 8's policy of including element properties in attributes, which ruins things by changing an element's
    // innerHTML whenever the user changes an input within the element.
    function getElementChecksum(el) {
        var info = nodeToInfoString(el).join("");
        return crc32(info).toString(16);
    }

    function serializePosition(node, offset, rootNode) {
        var pathBits = [], n = node;
        rootNode = rootNode || dom.getDocument(node).documentElement;
        while (n && n != rootNode) {
            pathBits.push(dom.getNodeIndex(n, true));
            n = n.parentNode;
        }
        return pathBits.join("/") + ":" + offset;
    }

    function deserializePosition(serialized, rootNode, doc) {
        if (rootNode) {
            doc = doc || dom.getDocument(rootNode);
        } else {
            doc = doc || document;
            rootNode = doc.documentElement;
        }
        var bits = serialized.split(":");
        var node = rootNode;
        var nodeIndices = bits[0] ? bits[0].split("/") : [], i = nodeIndices.length, nodeIndex;

        while (i--) {
            nodeIndex = parseInt(nodeIndices[i], 10);
            if (nodeIndex < node.childNodes.length) {
                node = node.childNodes[parseInt(nodeIndices[i], 10)];
            } else {
                throw module.createError("deserializePosition failed: node " + dom.inspectNode(node) +
                        " has no child with index " + nodeIndex + ", " + i);
            }
        }

        return new dom.DomPosition(node, parseInt(bits[1], 10));
    }

    function serializeRange(range, omitChecksum, rootNode) {
        rootNode = rootNode || api.DomRange.getRangeDocument(range).documentElement;
        if (!dom.isAncestorOf(rootNode, range.commonAncestorContainer, true)) {
            throw new Error("serializeRange: range is not wholly contained within specified root node");
        }
        var serialized = serializePosition(range.startContainer, range.startOffset, rootNode) + "," +
            serializePosition(range.endContainer, range.endOffset, rootNode);
        if (!omitChecksum) {
            serialized += "{" + getElementChecksum(rootNode) + "}";
        }
        return serialized;
    }

    function deserializeRange(serialized, rootNode, doc) {
        if (rootNode) {
            doc = doc || dom.getDocument(rootNode);
        } else {
            doc = doc || document;
            rootNode = doc.documentElement;
        }
        var result = /^([^,]+),([^,\{]+)({([^}]+)})?$/.exec(serialized);
        var checksum = result[4], rootNodeChecksum = getElementChecksum(rootNode);
        if (checksum && checksum !== getElementChecksum(rootNode)) {
            throw new Error("deserializeRange: checksums of serialized range root node (" + checksum +
                    ") and target root node (" + rootNodeChecksum + ") do not match");
        }
        var start = deserializePosition(result[1], rootNode, doc), end = deserializePosition(result[2], rootNode, doc);
        var range = api.createRange(doc);
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        return range;
    }

    function canDeserializeRange(serialized, rootNode, doc) {
        if (rootNode) {
            doc = doc || dom.getDocument(rootNode);
        } else {
            doc = doc || document;
            rootNode = doc.documentElement;
        }
        var result = /^([^,]+),([^,]+)({([^}]+)})?$/.exec(serialized);
        var checksum = result[3];
        return !checksum || checksum === getElementChecksum(rootNode);
    }

    function serializeSelection(selection, omitChecksum, rootNode) {
        selection = selection || api.getSelection();
        var ranges = selection.getAllRanges(), serializedRanges = [];
        for (var i = 0, len = ranges.length; i < len; ++i) {
            serializedRanges[i] = serializeRange(ranges[i], omitChecksum, rootNode);
        }
        return serializedRanges.join("|");
    }

    function deserializeSelection(serialized, rootNode, win) {
        if (rootNode) {
            win = win || dom.getWindow(rootNode);
        } else {
            win = win || window;
            rootNode = win.document.documentElement;
        }
        var serializedRanges = serialized.split("|");
        var sel = api.getSelection(win);
        var ranges = [];

        for (var i = 0, len = serializedRanges.length; i < len; ++i) {
            ranges[i] = deserializeRange(serializedRanges[i], rootNode, win.document);
        }
        sel.setRanges(ranges);

        return sel;
    }

    function canDeserializeSelection(serialized, rootNode, win) {
        var doc;
        if (rootNode) {
            doc = win ? win.document : dom.getDocument(rootNode);
        } else {
            win = win || window;
            rootNode = win.document.documentElement;
        }
        var serializedRanges = serialized.split("|");

        for (var i = 0, len = serializedRanges.length; i < len; ++i) {
            if (!canDeserializeRange(serializedRanges[i], rootNode, doc)) {
                return false;
            }
        }

        return true;
    }


    var cookieName = "rangySerializedSelection";

    function getSerializedSelectionFromCookie(cookie) {
        var parts = cookie.split(/[;,]/);
        for (var i = 0, len = parts.length, nameVal, val; i < len; ++i) {
            nameVal = parts[i].split("=");
            if (nameVal[0].replace(/^\s+/, "") == cookieName) {
                val = nameVal[1];
                if (val) {
                    return decodeURIComponent(val.replace(/\s+$/, ""));
                }
            }
        }
        return null;
    }

    function restoreSelectionFromCookie(win) {
        win = win || window;
        var serialized = getSerializedSelectionFromCookie(win.document.cookie);
        if (serialized) {
            deserializeSelection(serialized, win.doc)
        }
    }

    function saveSelectionCookie(win, props) {
        win = win || window;
        props = (typeof props == "object") ? props : {};
        var expires = props.expires ? ";expires=" + props.expires.toUTCString() : "";
        var path = props.path ? ";path=" + props.path : "";
        var domain = props.domain ? ";domain=" + props.domain : "";
        var secure = props.secure ? ";secure" : "";
        var serialized = serializeSelection(api.getSelection(win));
        win.document.cookie = encodeURIComponent(cookieName) + "=" + encodeURIComponent(serialized) + expires + path + domain + secure;
    }

    api.serializePosition = serializePosition;
    api.deserializePosition = deserializePosition;

    api.serializeRange = serializeRange;
    api.deserializeRange = deserializeRange;
    api.canDeserializeRange = canDeserializeRange;

    api.serializeSelection = serializeSelection;
    api.deserializeSelection = deserializeSelection;
    api.canDeserializeSelection = canDeserializeSelection;

    api.restoreSelectionFromCookie = restoreSelectionFromCookie;
    api.saveSelectionCookie = saveSelectionCookie;

    api.getElementChecksum = getElementChecksum;
});
/*
 * jQuery Hotkeys Plugin
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Based upon the plugin by Tzury Bar Yochay:
 * http://github.com/tzuryby/hotkeys
 *
 * Original idea by:
 * Binny V A, http://www.openjs.com/scripts/events/keyboard_shortcuts/
*/

(function(jQuery){

    jQuery.hotkeys = {
        version: "0.8",

        specialKeys: {
            8: "backspace", 9: "tab", 13: "return", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause",
            20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
            37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del",
            96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
            104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/",
            112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8",
            120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 191: "/", 224: "meta"
        },

        shiftNums: {
            "`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&",
            "8": "*", "9": "(", "0": ")", "-": "_", "=": "+", ";": ": ", "'": "\"", ",": "<",
            ".": ">",  "/": "?",  "\\": "|"
        }
    };

    function keyHandler( handleObj ) {
        // Only care when a possible input has been specified
        if ( typeof handleObj.data !== "string" ) {
            return;
        }

        var origHandler = handleObj.handler,
            keys = handleObj.data.toLowerCase().split(" ");

        handleObj.handler = function( event ) {
            // Don't fire in text-accepting inputs that we didn't directly bind to
            if ( this !== event.target && (/textarea|select/i.test( event.target.nodeName ) ||
                 event.target.type === "text") ) {
                return;
            }

            // Keypress represents characters, not special keys
            var special = event.type !== "keypress" && jQuery.hotkeys.specialKeys[ event.which ],
                character = String.fromCharCode( event.which ).toLowerCase(),
                key, modif = "", possible = {};

            // check combinations (alt|ctrl|shift+anything)
            if ( event.altKey && special !== "alt" ) {
                modif += "alt+";
            }

            if ( event.ctrlKey && special !== "ctrl" ) {
                modif += "ctrl+";
            }

            // TODO: Need to make sure this works consistently across platforms
            if ( event.metaKey && !event.ctrlKey && special !== "meta" ) {
                modif += "meta+";
            }

            if ( event.shiftKey && special !== "shift" ) {
                modif += "shift+";
            }

            if ( special ) {
                possible[ modif + special ] = true;

            } else {
                possible[ modif + character ] = true;
                possible[ modif + jQuery.hotkeys.shiftNums[ character ] ] = true;

                // "$" can be triggered as "Shift+4" or "Shift+$" or just "$"
                if ( modif === "shift+" ) {
                    possible[ jQuery.hotkeys.shiftNums[ character ] ] = true;
                }
            }

            for ( var i = 0, l = keys.length; i < l; i++ ) {
                if ( possible[ keys[i] ] ) {
                    return origHandler.apply(this, arguments);
                }
            }
        };
    }

    jQuery.each([ "keydown", "keyup", "keypress" ], function() {
        jQuery.event.special[this] = { add: keyHandler };
    });

})( jQuery );/*
 * jQuery Raptorize Plugin 1.0
 * www.ZURB.com/playground
 * Copyright 2010, ZURB
 * Free to use under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
*/


(function($) {

    $.fn.raptorize = function(options) {

        //Yo' defaults
        var defaults = {
            enterOn: 'click', //timer, konami-code, click
            delayTime: 5000 //time before raptor attacks on timer mode
            };

        //Extend those options
        var options = $.extend(defaults, options);

        return this.each(function() {

			var _this = $(this);
			var audioSupported = false;
			//Stupid Browser Checking which should be in jQuery Support
			if ($.browser.mozilla && $.browser.version.substr(0, 5) >= "1.9.2" || $.browser.webkit) {
				audioSupported = true;
			}

			//Raptor Vars
			var raptorImageMarkup = '<img id="elRaptor" style="display: none; z-index: 100000;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZYAAAFnCAMAAACy6J8YAAAABGdBTUEAALGPC%2FxhBQAAAwBQTFRF%2FFh2%2Fchs%2FrJS%2B7la%2F7l2%2FqhI%2FmV%2F%2FIkK%2FsJk%2Fs13%2FY0L%2B5tr%2Frxa%2BrWV%2BZuY%2FcZr%2FIkM%2FdSM%2FbNT%2FNuW%2FMlx%2B5U4%2FKtK%2FNKD%2FLdX%2F5VS%2BYoQ%2BcDD%2Blh1%2B9aQ%2FqBD%2BT1S9mqL%2FaxO8WSD%2FaNF%2Bc9%2F9ams%2BmyP9Ywl8kRZ%2BNCE%2FnaW%2FrvA%2Bp0%2B%2Brla%2B6JF97NY%2BZ9E9Mp97sCN5FJp6bqEt3hX1KR07ZxG9aVJ5ZZM8aZQ06uC3als5qx17aVR9KZNjmdTwaaOy3xKiYJ6jY2MS0VCNTQzAgICBwcHAwMDAwMDAAAAAwMDBAQEAAAA%2F7tb%2F7RS%2F79e%2F7VU%2F6lH%2F6JC%2F6dE%2F8Zo%2F4cG%2F7pa%2F7xc%2BqZI%2F7NR%2F44H%2F7NR%2F8tw%2F7lZ%2FosG%2F6tK%2F6pI%2F7dW%2F4kG%2F65M%2F6dG%2F7VU%2F7ta%2F71c%2F6tJ%2F6VE%2F75e%2F7RT%2FqZH%2F7hY%2F9%2FS%2F4USykMBKAwAlCsBMiMUrKys5KdT%2F2N2lpaW%2F4It%2F7Fh%2F1BCb29v%2FpqS%2F5Nj%2F72M%2F3Enzs7O%2F58e6OjoBwYG2ZEo%2F1gVyJVM%2Fz4vuXkm%2F86QfGE%2BU1BN%2F9F6%2F6iI%2F3F%2F%2F4mTeFIg%2F3YU%2F29k%2F454%2BJxBnnQ5%2FrO4%2F6FY%2F25JVT0e%2F4ZP%2F4kd%2BKNG97RW%2F8hU%2F5QP%2F92W%2F6A8%2Fqmt%2F9B6%2F5A1%2F5wY%2FpUo%2F4sG%2F7A4%2FqMo%2FyxN%2F08E%2F2oC%2F9eI%2FyQ%2B%2FyhG%2FyAuHx8f%2Fxsl%2F5U2%2F1wE%2Fq1N%2F2uR%2F2%2BV%2Fy49%2FyQ3%2F0di%2F9mP%2F2MD%2F1oA%2F2eN%2F0Rc%2F7NT%2F7dV%2Fz5TMzMzFRUV%2FzNE%2F0FX%2FzdKIiIi%2FzpP%2F6st%2F1F4%2F0toPj4%2BJiYm%2F1UCHBwc%2F1Z0%2F9uSNjY2GBgYEhISLy8v%2F3AE%2F5g4%2FZ2kKysr%2F6tG%2BYcHOTk5%2F09vQEBA%2FsPH%2F7NR%2F%2F%2F%2F%2F3UE%2F65M%2F1l%2BPDw8%2F8hs%2F92W%2F9WC%2F3sF%2F1%2BG%2F65N%2F8xyPz8%2F%2F4ME%2F6RD%2F4kF%2F6tJ%2F69N%2F5AH%2F5gI%2F7BP%2F7FP%2F8Fh%2F6BB%2F6xK%2F7xb%2F6lH%2F7VUSyhmIgAAAE90Uk5T8fn8%2FP%2F6%2FO%2F09%2Fjs9uzN8tjy9%2Ffh6vXn7%2F7A1d3j9OC%2F4Zzp0qPgqa7C%2BP7g4dO9w6CAdWU0LWepWYMfPEx1liQTSAsFGBIOCwkEBgIBAPRWU%2BMAAGwuSURBVHja7b0JdJTXle%2Bru17f19339vy6k%2B4knW4nTnzdMWYwk9AAQrOoQtJakpAChVwqSsPS9Ny3k7gdx7FDOrYTxzNxPBCMFebYOE6IPOHEVZ7BeABPmArYK76GBZZsRQVVUqH19t5n2uf7vhICDSXycr7SgBMDrp%2F%2Bezr77JO1fLouvx9e9Gm5%2FOJbLr6jL%2FDNH%2FDKmn407OVzL%2Fv%2F8EcsU8XDglABiz7RV3g8Cf0RyyQSobe6qLCwoKAgJ2d%2BHq65i8yaC7%2FOySnAVcQR%2FeGxyZomRHxFRYADgOTm5ucvXHjBBc1NuAZhBVNmwfeDn7rggoWL8%2FNyCwoKC4uKKhSdPyg0WRknIn7gi3Ly8hfPumCkSa1BfMQiIOFwSj9yfeqChfl5oBtj3P5gyGRlGElRYcH8vPyFl3bVNjcbJk2DMXgkEIKiviCU3lRvuFei6Q1%2Bceai7JxCCecPBU1WppiA1QIiCxZf2tU8gqsJH01lMOVaQaBBXFLApFdIpg9XPB4PX7A4O6egsMhC80csZ4eEjFZB3qKZ%2Fx15NNOrKcaQiBdfYYCSCgqB9OGnODwGSzyeSCQuWJxXuMxyNX%2FEchY6KSrMXbD4gvZm4iGlEiOpDGpnErOhKJdiHAtiIR5JfPqASiKZiMdnzs0pVObsfJZM1tQyKSrMWTBroLaWIREWLKaZCDDMrTAogEPrQy2gAiuRlCs%2BawGRqTivJZM1lUyKCrNn1gITQcVA4WGXYMKdvXDtUiWW2UKJIImkWQF8FmYXyuTzfJVM1pRB8RXmLRxoJyojtQ4qMVsoMS0UKRXy9hYUiYXhEC%2FxJBKL5y%2FjxuyPWLyYLAd%2FsrhmQDIhtSjrhR4lZmlFxsMII%2BXhTIQ3iYPZSjhVEkiaJz4zr6DwvAWTNQVQiooK8i%2BpFdYLn5jRicxR9Apq09UbTOm80e3jbbtFHCQcwYbWBfkFhcuElznfwGRNvvUqyl3YjtZLQqmNaZ1YVIKwJJTeoHLzKUaF%2Bfg4eRRFJ6GkolaEPq%2BEf7SoYNky42T%2BiEUrJSf%2F0ppaI5VYrNaGMkhGLBU0VJw1Fi8LxuQSEFTgm0AiorhEVsIDZCKJRTkMzB%2BxIBSodC0eqG2vZUqpZdZLFVmCajnSlJTFJe4wYYZNwtgtpZYqWAAGVlVgEZkyGS%2F%2F%2Fx0LGo2cxe0DtdypIJYmXvrCnN5AUTRMmiKYyNCLXg7HgmIRVBIRKZZIIFIlVietQCS%2FcJnwMeeNJcuaPCjzF9aQVJq5VjgUmdYrnYRdNqzPylLiiaQdegnDRSg8xEJYWuABMBfkIZjzyJJlTRKTIoBSa0OBbMViEmyyo6%2BUpRWV0UssSQAT15YrkEhahiuJ5kprRaoFeLRUwQNoWjpnzj%2BvwGRNIAq265uzcMANJTbihhJMOYr32p30mcgLoWiPEjBUkpFkQLMgZ7ISnb2WCkGBVxSfRWTJzhMPkzWRSNQOe85iYb5qNRJy9bWmfB%2BE1%2BCgs35PODCl5%2FGwR%2FiVEGkKs1raboFoQCVSK4JLC3KB14zc8vMGTNZEMFleJBfuEhYVLBLmiwkF97goXyEoQXqsemTKEXy5mQgkcZVACrEkAm4nL9yJpIIfUUGlJRRaDFnMsorzwZBljR%2BKz1eQm5efvzh%2FQe582F3P%2F3ytrRRUSQyekVoJhV7BQUdBMuWVpqAFIygJOwQLJG0nz0IvkkgniQS%2FjUobBk%2Boe0bueZLEZI0Tiq8ge%2FGlNTUDYsE3n0fz1c6VAnVJFItMV4LKgqW4WCwstgVzV1skGKOVlVUaS5U2XHzRPwmFQt0hjJWXTX9DNh4skC7OBy%2FSjquWP5YBG6F6cYwUA4kKGjApFVkoVuVhLyrMgsWddUnjWCJMK9LLy0UGTHwXBSrdjfUzcwrPA0N27ljAo%2BTO8mDiSOpxtwuKk82x2IjwKUGKwbRUepWnTycWF5iA8PYJZ5qCVKpsKsQFFn2Haumur%2FyLvHKdXP7hYfH7C5RSvKFg%2BNUsPQuUwoyvN1LRtfvUKFphxRatFlsszN2TCatSCmkJqUeuxsb6hoaG88CQnSsWf1H2sISSTiq16FLwcWQstLki85SgVZF07UDKpMVpwpTLTyKUlczdV1Vxh2%2FAoFJAKmDEWisb2tpmF5RPc0OWda5eZbGCYlMx%2BWMzUSEoksqgqhdDxZig9JoimJMKcElywdhQ5L4KF0unXFWMCaiEi6U72tiKWDqqZ%2BSU6yLZHw4WMGCzvKgwqTQ3i%2FCrWUNBKjHJhPVOuOTSZ0ouyaSrMMk2IqFuv5LFYGq5oWgb1o1UGho6qof%2BLFc6mGnKJeucqOR80duAWVohAxbDEEwxGdQ5ZJj3rqbcYokTF1EwttEEdBxGn1ZWiZcHl2iLk0p3fSNg6egYgpU3rQOyc8Hiy%2Fni6F5FSAVNGGb2sSZpufAVHNRb9VZTsQqT%2B7hjgZrxqGqBVRWoWgmPl1gcJgywgMcHl99GWOrmlumU%2Fw8Ci7dWXFJR5Ra9L6ybisNWn7eAEpZtxQqL9CkJ290HdM4iqIBQ6KlyQ4k6mFDW0l1fXynUUjdUlz%2BNA%2BWzx%2BIvuNTLgrU348OkUqv6KKixRbR66xYw7F1NBTUY1VTMtaKqxvH0UlGrk%2BqTVA%2FrdMXGkky0G7mgXDqEFaurm1M4bbmcNRZ%2F0ULPCIxjQanodknDRFIZhI5ibKPoNVBSllb6eCXMoRbLschVFXGbMKe3x8ILqKWxsVIZMeAi7JhvGnI5Wyz%2B5flemT0ysVy93LOPxQwTEkosNRgGrQAT3d0CXoU34Pd55%2FYeJkz3U3gEYV5UkAv5FmHGYM0tn6b%2B5Wyx%2BHJr2tNg4XGxXDHRWqy0EjMFF3kogh9W6eszjoVvR45uwuQOizBho1LpJp%2Ff0KCdC3KZpnYs62wdi3b3ZtU6vIq2YEAlFrOgxORRFfQtoouV%2FEpvWq24oMjmI41mpU7zW0YzYUQFuAifr9RSV5dXOC3zl6yzdCyLBzyhcK9Sa6QSE7kKOx4hWAS1Wnp7HX6lT2vFkUyyFmMmmCpTfDFQok4qhASSfBUhV2u5HMsrF%2F5lenE5SyzKhLFl2S8tFVKKfTYiJstg0Maq2yYJSsqR3HuUXFSBkjl96VhW6p17IxUnlWi3sGHdjcyKCbkcO5Yr85dpxSXr7MQCsfHAaFoZUQ3GqBRHJ77zMFFKGbDeVJ%2BlFa8YzI7EFJeVup%2BCWTCPjAWlQpVKwFIJVmxIq0VyQTu2fBpxOSssRQtqHFhqvZOVJuFUYmlOEulivlMs6RpaXUbM4VciLaOJRVIJdYvEpbLNqOUYYPnr%2Bbo%2Bdn5iKfz8wMCobkU5%2Bxhy4VpJsThMVV8kFNuxpKViZS3asVS5HYu75iK5NEosp1U%2BOSS5XFii%2Fct5iMVflG9TcbkV2YsfI7U4jtY7DVgqbKC4TFg662VnLSuNY6F%2BF3xCWi12ykK7LWTFqFjJnAtwmV1SPs3Sl7PBUvD5gVHdipYKbnuNDMpWsEGPfjCRsajkvs%2BplYS7op9MaCymL9%2FRqUf7kkotNhNJBTfzK60I%2BRit%2FLJpxmXsWPz%2B%2FIG0fsW4FQEFqAQNFdRKzO6eRBMW7vWshCU8DFjCHYOtZKGx3MLvjEaVWrzFYmEZElKBtRrC5PJplb6MHYuvyBKL1orchYyN2OeGLa241KJeYbvoIqDQY50fDiQSHlpxbOGbXhcXE00FS8i2WuqQyuq%2Fzikvn07uZexYIAxLY8BYaVJCwaZJbsFiDihWbZ%2BfHjYdSIRInFlN6J5j0%2B7CLRju4EcRTFS06Tm8PacCWOr1TtiQNGKrYV1cUq7Sl%2FMMy6UD3hYMoTCtiL3IoJVIhp1BmFCL3VHBiSAMfpLYbcEC7n6XaJXqarXkYqA0UpqvsDCxwDNnWrn9MWPxz4fWyXb5cAs2Iv19szk7HNSHJLzyyDA%2FX2SdljDnivjx7kRAexbVSLmStSFJJlWqpRWptNhqUVS6BRZV2xdqWY1ygc%2B50u2fV1ioGqYem4rk0sRODwc9j9k7jhW5i%2Fl03osMGZcKmDDnMTxtwUQQRjYMlSLY6GDMcvZGLZWshiw8Ppqxvy8gtz895DJmLJhK1uKrdsCZ21tjQnDjnlNxQWFUUkorfQJKok9SiVujEOQxPK2VQMAOwtCvIBADxTs2bhRY6k%2B3mcRFUkEws8umT1Y5Zix5aMIQDJ4n4llk8wibFOJ0K44gLOx5kDguHoCCj1KLPhqZMI4l4qTSWWX3UVZRuwt9SCi2ZyEup9mWi%2FT4q%2FvhyZs%2BZmyMWPz%2BxUIrA5ZfkSXjZjb%2BwFU1dtUnXSeJBRZiQmJJcMeiU5ZEJOk%2BN0EnWKK86TikEsrukO1Y1Kqv5DVkbcOAC5mx6cFlrFggaRFGrHagllMhLl3GrwRtLCkehTnbXRx9x8gk4fAsWixp%2FEqL8%2BCE2GpRfiXU3e3CUllpbVBKscBa3T972iT7WWMUS26NVEutaD9q1xbMGqrT5LBfMefRyBTr2Ut59ugzrSS0t2d%2BheeRlLK4qfCOPbdYKiv5jotSC6JZPW2isayxaQVawwaEc1HtR4ZKlxmrM9iU3q%2BkzKQ27VuoaS%2FuGIbA3D13LE6%2FInvDrEbwtFgaOZYGkefL7Ul0Lv1yXVwiuSz3nw9YoDUMsxUFRWllxBWDjeJYwu7wGPfBgIh9fDXBkntFhbkVxywEq%2BHFvVnsxIJJvlaL5LLaYOmfO03M2Fiw%2BAtnUb4yMKB6kZpdJszl7Z2OxTWfFaTS65KKpRVToeTZvQvLmakYrbRKLm1821hj2dT%2F5znTw4xljcWELRSxcW27TQVodI2kxeKxxWKpRe5Lxu1TxY7kXmpFH5O0TrM421vT%2BRXNpRXVQll%2Bm1CLzPM1lU39UIOZDkll1hioLBYWTGgFOyi7nN7eSysxTyZBPbpNtLzw2Ud0dIKJhWtFzqKKjHZu4ozunsTiUAum%2Bf2aS3%2F%2F%2FGkhlzNi8S9fJM8R6649eWLCiKVppOkM3l7ZMOxw1VMOe1kUps8YJeKOHRajFTE4hEZVRDz6890mTLe7MCiqhMzLL6uVVvo3bZpdNh24nAmL37dgWJ7uZo7FMQXUFYN5i0X2HcutSdwDs0%2BuWu2tLAZTWywRxSXi0d%2FqNmGyY89k94qKI0A%2BdqxecUE0udMhGMs6E5XcGicVNZu1K70FY%2FvEWja91OOa0v1hCMWMq0g6xlXoir6WSlIqhdTi7G5N13Qcaow2dosHzhzRI7N8xSW544oP3nloSKgFHx0kZ1IuWWdII%2Bc7oNRSgl97Bsci7FiQDzpUPa5haArrlU94tIPe2ojhpDD4cFPxsmHGr4RUC5LE0tgouRgsdeEdaz458cFDDz01JJjQyp3%2BWAq%2B6NRKu4cFC3pQcYzUI3cSpG7KXj0gQasl6S0VyiITLr%2Fi4Viitlq6ZSt41IhFUqk3amncu%2BoTgPLOQ0899UG1xIJkpoNcskbfvp%2FlJZZavkusplCZR2jFpgINrtjkKg6z9KFjceaR5vh93EkG1aKprBzDuQm1%2B0UmzFl8aRRZfmzL7z%2BRVH79643Rfk2F5FKeYe%2BSNXpo7HQsao4LiQVisWYzHiyoJx8ZpUgq%2FESL6AZPheOu%2BZPeanFoZTQLFg2xg1%2Bqv9WR5TdWosuP7l2loCCVd%2FZWIxBpxKZDMJY1GpUF3lpBHDh3kk1oDZpXkBuwoLyjqFeN0cXMXvoV18iwhGtYBTS8UEE%2F4YbCvH3I5e0lFK0VHiRX1sfW%2Fv73QOWEMGC%2F%2FvVTW2J12rPgmi%2FlMh2xUNVYUhlQobGg0sz7j8TmPafiGtWKRyfM8S%2FqDksjFksvCZO7GIfvZcEcJkxRCbmp1NdH924kKFoqYML2Vh9bvYlxmZNx75I1Fnc%2FoI9%2FCSrQ1tosJ%2Bph9%2BSgMmBdQQuLSVfoA6OwXiq5xMP2wDDLiLFNfA0lMIYYzNorFs7ebcFIKARFSeXXv16xI1q3evUmtv68ONO5S9ZolTAvx0JiGamVxWOkopkAEksrQS4VgiJKLnGuFUXG0RuGWb6rldLLhHm5e0dvmMIihKKlIqD8%2BpO1ySFM9DmXuVou0wwL9YEzE8Yci4BSq5rCguhaQCceDl9ppVdGYRgl91lVY92HxDpe0nfoe4gl5K65hBz9LhKLEAoyASgfSPv1GlCJDdF%2BPsdyYXGGrVhaLLm2VjgV3RoWM6Mng2pYqwOKEIpKXMjhu6goKHwPP%2BnqDfM%2BUuyR3NtaEUxalFB%2Bb9kvsGBrY9ViP99AOY4xcplsfp1WWHwejoU3uzQ36zMTsGRAJvpeXAkLviAKw%2FBLBGFOrYhGpITVHRZwN4N7nCj2qE86m8OYUJRUlKt%2F7bWnkIpss%2Bg3UI6bGDlD3iXrrDIWc2YCnyZrTJg8z%2BJw90EThOkWfRtLQnTtOcTi3gELjEaF03FQie1Y5YIiqTy0RlChxsp%2BSUS8lmQ2Rs7yjo2zawZcFUpnw549l11QSTmw9OoYTNaMvbXi8isBjw79M1swUQjjfiW5Y%2BPvORQqgEkov%2F5g1Y7wkDxKYZzLcXoyHCN7Y8mpcXsWfOw2yrRSccZg%2BiKpXld%2Fa9xqDnMdAHPP1LWP3zvxdIdYH2XYMJHhFzmVpwjKa78%2BsXFHkve7KiL0XDj9sPhNKUx5lmaDZUR6FpdY4LCkA0tQuRba8tJXq1pdx0orcVsrrq0W3fDiziOtgQiKSmzHSYuJgKKcChiwFVt6olYXcr8wX%2FQcPz4%2Fo04%2Fy7Po4hSLOCdZy%2F29g8rgoKNFbNDO7k3Z2KLSx%2F2K6%2FAX35a0LpkQpyTtQ6zdOgzrju%2Fdsur3HlCekvEXGrArtsYa1ZlWwaX%2FZomEXnMyWhjLGt2EDfDDq1YQFrO14pyNMGiisJTZX3EOCI2rrmO7Qz%2BgTt9HXO2t6pCkMl0tzhAs5UZiQwGlPPjgr644GG8w25Oif0%2FIRH6gFctcHTlr1PTeQywjyt07L2KJ2U0vg9KxMK04J7vIrmNXh77z4JftV9SgY1RLxDrundy%2Bw0Ii0hT085ZSXnvwlw9ef9VItzk%2BuVo6F2m%2FxMqoFfPAkjfAlpyOwE9JiqqLy6%2BkPG%2FzlFv4%2BHKNEInrbnBLLK4YLGB3IVWprmPmWOLeRBQTppTX%2FuN%2F%2F9d%2FXL9%2Ba08sVO1QS%2F9xvuZkMnXJcieSn3djYf5eiMUVGtvtYVZ%2FRZCoBMPOKIyYJF0Jiy666KNfnXYXkhyxJ3xLKLx9x9qNv%2FciIpgwKL8WUP7ruV%2Fcvn7r1h21VR3K5Uufb2G5uDSDqUuWVyIJvkW82p1YlL93iWXQnlgxKBMYEotQS5%2FrmlXy9y6taLGwFn1n%2BZi4xHocQDQOg8RmIqG8eujQvd8DLj3JaiUWoRcLy%2FElGbRiTiy%2BHEPFDHjB0Xq859gRhMU82isUFdyXxMd9Io8qLgk7NMYj39LfR5xUVurycbhnx5aN2qdzGJKIQqKZKChvvfnSobffPnTo0NvfBy7bk9VyXgKC6V%2B9ycIyN4OpS5bL39cMiGegRmulud3UwmIusbih8OwFpWJ7FtutOLJ7LZaIJ5RAbC8o5BPPdQJ5IBAgIpEwJv%2F%2BH%2F8FUF499PazbxOXVwWXIX0ejBIXvmZnMBZzYsmrqalRWhlwqMXb3ZscX%2FkYK6kEpcAK63EVcSeVOOs61mKJ6MNGmktnsmfLGicIIqFoEA8EwpFA7R6hfA2gvP7q28%2B%2B8eyzzwosh76%2FdceO7YEhc6i13ziXnfB8ukRasYyrBQaG1SitaM%2FSbIVhHlgGm9QGpdWLxAIxeROIKwhzaCUR0BlLgG6RZN1hsfXw3ovHsd4R6yHNQwHRTIRLOfTsG4cPv%2FHGs0IurwKXHcAlOsQOHmko%2BFLOJRObYQ4sC4aFWoRkjFikEdPXEavHbnuxtGL6W1PmnKTamPSqhGGDfoI69RPC4SfYFn7gxDt8PSQetZ4SOAAIR%2FLaa4oJWK%2B33zh89LDAIuXy6qHvIZfGOoWlfzWnsvP43Mwl%2BhYWf%2BEXiYoUjMpZdBTGuioMlUG7vWLQdiz46rOPSYbNBgsXCx3Io0e4Fex20TYsEl%2F%2FlPdCEOLFl0Dy2nXE5LmXDj17%2BOgrR48qLlIur94LZmxvrK1Oh2KbhPlCKDvJuWTKimXZxbBhTaWGR8dqXAXtsgCNLngFu4gL3WHETBh3LLok5kVFJyxqBUgnCWjWS4joOMkcy8jWd371a28EDpOl1nW3vP%2B7332HmLzxysevIJWjSIXkcojk8tLtIJe98SHt82%2BWbmXnTvyAreOy8syrBQaG1bjVwnMWQQWaKeCDd4hRf4XVi2T2wPgNU5JKXCWSSTeXiJQLWjAlFUhYUrvueOgpDw4CBseBRO5DJLS%2B9ezhV977%2BGPAorkYK%2FbSS8K91OlQjHgItcDSziWTvgUGhtXUKNfiSQXb9FEp9DFiNVR6WDCxiR%2B2TxRLrbDsXq4IxWF4X7Rw%2FHhckmEJjBxcf8c7D5kaivf693%2F%2F%2Fo%2F%2F39%2Bx9d33cGkuWi7Cir30Npqx7W26WKmAkFp25mXM52elF4sIkGv5cBcRhikwCoqWih0a98pTRs5pFY6j3pZYpPWK0DXF8tp7kdxH4s09u9bfcccd76jw1xLPU0%2F9x%2F8GP%2FJfz%2F3Osb6lsaB3kVikWkAuZMaSQ0ouCohYczNWf8lyhGEDJg4TeqlloxFQK%2BBS0KsEu5gJk2GYoxFJ7Es6LZhZUNHvs8WizhZjIGZMmE7uk%2BHm4YO7tq5ff8UdiOcOE5hBmPzv4Nvfeuv17zqxfF3KJY0V%2B8X3UC6tamgCkwqs2aWZ8vlZzOFfUqPVos%2Fl1arj3qLsQi5F%2BxXTt2d3Hpv2MOcVU3ErdcGtloSqVIogLCGDsICbChbCAE1Tc%2B1AT8%2BuXVuttfltqHS9%2Fex%2FOqn87jueVsxguRewgNfXWIxWdu68uDRTZTGDpShv2MuG0Y5xl%2FAsIJURFYU1ySisKxj06DzuVZ7FvvvLnlLFoNCpYnL3onCcjJggzH0cL9oSSEDlU28lQG%2FgTYePHn3lvR%2F%2BbsxYpHN56RffByzC68NBPQ5l586%2FLcmUc2FYZil%2Fr8TSTtd4t9d24dFiOmiEMZjkYZ%2BeCDY5u%2FZoZnvY%2B448V8dLhMQigrBkhFrBnVQ6%2BSFJMaGKbUze8Aq88e%2B995%2FpsLyX1rmAXPbu3RsbomE8HMtuDMVKMxSKZZk2ypoaY8T4Flh7l3YsQihdJjTuUjd8BgddMVhvKuV5daGp6uutloSchZQQIRhLI888EwG3ijf8kKi8991RsHycxrlIuRxzqGU3vnJLM5TnZ7F9Fi2WAX7kGz1LV7PQSlcT3ysWcXFXkOWRujsMxSJqLgZNn6NU6ZwcFpFHVyOjnmZRUHi%2F3l1CLN%2F63ehYPJ2LkMv%2FGRKnjSWS3UItczOV52ssBcM1Lo8%2FIJrC8XDxiE5Zgio2RqnoO4rtRiRx9ktfZ9TrpRWT6POxOzTfJZKeCm93ITbYWPGNj4VYPGyYjMRMLObG8vr3AMv208cUlt2KzO6dc0oylOdrLAtq0qgFDxbTICSMwIDEiOjRt7XiCI3NZUbighaHX7G0ktBHv3Svscvbd3r1UcpxlPC6SYjlve94YPnP99I4F%2BnzAcvtgGVvsk6rRYoFntkZVotfOHylFe1dEEutyFukTpQd0%2BeMBu3DkmqJsS6enZRqszju0aGfMFA0lohsDYvYnWG6L0z6e0%2FXItJJo5bDvCyGagEuv0Artr16tcBCPORrdqZCMYnFN3%2B4xpT0xXaLVAtmkyPSt4h6mDZhQWfNBZfcJJbnWcIet7HpRsqk12kWdwzWiUQiRIV5FtXc2h36ocLiQeV3771nOZfD7gj5F6%2FftZecPsMiqOy%2BuCRDiUuWFMsisdFimzGpFTrT0kxxWJN9stixG8lPGIvzLFIr1mRw3kmZdM5z84yMCUnEOsLKWvZueOUVQeWH6T2%2BCcUOu0Ox1%2B9FKxYfIiyEY7f8fGFm1UK7kmwxtZi7DdDdN41wKOqTUyzBXjOtwithiTuCMOsio5XSwZglucimY%2BNYxLkvI5YfjuJaXFaMYxFOv5pqlYRkpwTzzyUZSlwklvnDNhbhWuSduD04H6Gpi1Unxau5Z2BQQlFweo1Ywrrp2NV2nHCIhc8%2BXBlwYmFqCeljeeY0HoklHZbvvmdhOZoGy%2FelFVu9abelFoMlE2rx%2BxbV1AzXDDMqNUYs6z840dNMDa5ybxJ8Pz5boUC4fmBQHJxkagnSUTxxoMV9cILvtbhPScIh%2FIi8BUQ%2BUikR2a%2BncsgWbcNuUjbMy7d8%2Fb0xqeVeFYttkmIRVDgWfwawoA0bdopFeJYRfPevaDaTQlVif5D6G04MePiVlC0WfuME35h0aUWEyAnuYaRQIuboBAvDbLF4RGLf%2FeHYsIhYDDLKTbut9bclGSrtCyw5w55qQSM2SM0%2BPWb4ThPllcFa6EHB%2F%2BWKEWHEeBQWTvEW%2FTNk92ZFkkouVpofwZfsz2%2FpbtFSCRmxSCzfSe9ZdOLiCMUEFmHFWo%2F1b9ptpCLVUpYpLP7l2cO2WhiVnlWnTp34YL09wrVpJLx1xalTp1YBmK22EQuKE%2FiO4yx96RIWtfmlNloCcr%2FYTvOt3N4Kw77xirFhH%2F9nujDsTGp5EzPK7VV1lloO7D6QWSz%2BhcNcLMqI4RDq%2BFp490%2BSFVOTREgsAaRyComdqOVuJU0QxhKWhMcevtzEp4NGicgoU3dCEky3mgp%2B11GDxenzuQlzuvy3bbWIEJljOZB5LEWf51AMlvbmkaqN4s0fUM3HIh6LxwQVIAZy4UGYviIv5R2EuRpeJBWtFTNJZKWrJKa8vRlV8UNmwxxFMZuKG8shXX15%2Fc3XpXPZxKHsPnBhJrEU5QwPO1yLEEtzeypAb%2F62Dw42awsGYIKB7RLLqRUfXGHl971qmq53L7hLKtR%2BJCpidCjPWDAvKs4RIjcctbBw7%2BKgMrpa3qTMpU1j2X2A1sUZxZI9POxyLRgbt9dKVZz8YKs6Lkk1sWB0r8Jy6oMPBqzRFcSk13uHpU8cwrfFkjRiQS4rWb%2BLp1Zaus3NLHfBniSj8t4PdTD2HQcVxHI0rVrelJnLJoME1%2BwMBsiw1eJSS42406g5KVVBWEaEBQM4fY07Thm57BrUyX2vvBI35VXL70uo0xO8syKhGl5oyF5Se5b0Wuk29xi9B7GVzCW%2F%2Ft3fffc%2F4YuA8q33PnZhOTqKWqTPv1laMLnmZDCdxKzFisTMwZYRZaxObJUWTKCJn16rsYCSeF2%2FVw045vd8iqXuzeljXJLCsdCeJI48joyiFVl86TaDXW44qtTyre%2Fq9PFb3%2FqWUynp1SIjsTelzz8uieym14G5mcRS6LBhIBWi0tXepIzVJ%2BvJiI3IsliizWA59cF6awCiuuTTQSXRq6jYWgHHIg96JyNsqyWSbluypZtdWyhsGN%2BX%2FNZ76dboavnaXvL5xw8cYGLZnVeauZoYFMQc8bEu6mssK9aPyI1J0kyi2hixU59coetg%2BmIW4fdxKaGk0UqS9eyxqn6nR8biuqq4u%2FuH8E5DNsJcytfTYtGNYh5qAbmIPZfjB%2FjaXVyascI%2BDHgZdsTHAktXe%2FugwrJtPeIw8XG1cfmn1pxgNRd2t0GfhsItmFMroBYRgIn6ZJrd4qgnlW%2BgDQMq733dqzbpwnL0lfRGTIZiNhaZtmTEiOFeyzDzLfzQpMayZqt1Fj9Rvd1gWXXCnkJtbpzQLqZXqcVDK6IQRnNCXSbMYxKSOonfTbkkqeVjnkZ%2BnG651GIZMRGKWVgeOHBxaWnGNo3huKQ7Pm4Xakl1y7d%2F21bRqi%2BL%2B%2BG2pMFy8oRjCrXcxDfxWKLPg0rESIWqk6wS5tkbFjJ7xWo61U1CLVbRZRQso6pFVMWOKyL0mlOq0pblU4%2Bl8FLpWwQc0ffSLtWisBwcYVuTTeHGIYblCqu5QmolZQ8T6ZNdx06xiEslAzwy9hyyx9pd9A7Yho%2BlWngSOSa1ODaNActzYuN4p4SCnx94YG4m1VIoSi%2B6iKwa97ram5uissiypodSyUF5WDIVrWOh2BXWOUk1VTfMOl7cHfrKsYjrpRKcStresBbnbvFR6Vt4dXJ0tdgH9WSLBanldoMFwTyAr9zSzLXvQYcYrRqVvLDzeU3RqIzE%2BFFWKONXDRnncnKr7gbXw457abauhaXPUQfT1%2BRFRN%2Bey9urhhc1Nkz3IUkyjXcdFWrhXXtfH0Us0oYdFlS0Wl43WKp2IhH9FJdmrAfZD5stAsuwCcSka4FK5ZASRBObEB4En8%2Bs2EHdo6%2F7w%2BzeCqmVPsdhFj1uBw8beYglove%2FjFjYBljoJqkWjuVbZ7JhRx0dFi8JsRCWvaiWB5RWHrjQYJnyHmT%2F8txhiws%2FkD8SGBLGauvgiLWTH26s0yHySd123KsHg7unVCUcahFbLQF5dsKrvZXvSTq2i4UVe8%2Btlu%2BOyeN7qeVeacQeEG4F1%2BySzB2k8PvzbLVAkl%2FTDli60LnEZSTcY50uhn2vqiEtl61xc6hY%2BXumFXtymKkayy0Wx76XaayQm8UhBcY4l25Re%2FnGYakWFh%2F%2F59l4fB6IierL%2FTuJB%2BnlgQNzS0szdaY1C7cmpW8xZX199Dvcej%2B%2B82vDI7JNTLRXYFWsrkpiiYfV8VXTdexFJZHQZcqAciyyms8yFouKUYulFNnycliq5ePvntnhe6nlVZa2aCwCCVmx%2BaWZO6RHST5z%2BjVsXFVt82CUfHstnf%2BCrkrctKeDRiCXOpG7xJKq7TioOsFTvQ6%2FYs%2BgpkMT4orPpEjuybXgo5Z2LCGlFDsIo4KYUsvHX9cp%2Fsdn8vhHvePjN58jI3a%2FdPkCTElpacaOtPrhyOQwS%2FPNqUk8YTwCM4T2btkeVwdZSSuYVA6GQ0PH7t%2B7dkc0KsUSDKtpxynPUaGu%2BS5JcZiFtolxNkLCZcKoZBwJtfCTE3pjsvEurRa5%2B%2FWdH348qg17xQRizzpdC2HZO8SxXJyx0gti8S2wbBhSqZFnWdubu1Iw%2FbS6SoxGQCBBNU8%2FmKAJnEPdcREaB%2FWpCb4zyU2Y3e%2BSoLEVeOQ7QmpJeLVR6iYkh1hILTdptXyMuyzfSe9XXK7FHYgJtdSJSEysOcbjL88AlnyHaxGRGJ3H7%2BoaiUdbo%2BGmrhFxwlg07pEtC8ZbTle3RZNhPURfN%2Bl7bRcnXYdZEvIQq0VEWTAtFrYB1mLfN%2FGeVssY1pkCMYXlAU3lgbyS0sxNsTBq6XH1HwOWrhG4WVWcOCLzFQyatrDevmQybCX32FvRF%2B5N01qR9DiGL04WC0umqbSwhMWUXNi9Bkhlw2GjljFQUa7lDU%2FXIrEc2%2FmAXpBMZm4sosuIqeFIlE4CFjig1yWO5wkq0r0IQK7knvdWxJm7TzrHVtAOfpL2JRN207HD2xt%2F38ItGFT1D5%2BFWl55xTH0hWPBkthzlOWvZlh0%2BTgjg6v8vmzLtXC1dOGiNteuJkZEteg3mVH6coclbFXC9FZL3NVZERD9LnoYEhX1A6rp2D5gpB1Lt3UNyA1np5ajr6RzLWTD3FjmlJZmblglYMnjlRdz%2BptOGBOYEZJLUHr8pqagc7xeb8pRcrF38NUWWJ%2B730WYMNRKwLSCyzSSqwXRaCpi3XAWavESi%2B1aCMv9%2FbsNlrzMJZOEJdfCYp8EI7WMOLgQkS7ZUdGnRoLTFrFMI%2Fm%2BpCQSdzWHiVFImLmwUSKdounY6kEK6ciYzdCHtAU8BanllbFgofDYuJa3Ha6FCvsWliUZdC2IJcemwjaNm9GM0eXFmor2%2BgKCcB3q4jvK46la7NHwYtfEKBhLKrVYVBCMKuU7Y2MjlnrAclioZWxYmA3zcC3PfR%2BzyZsNlotZ%2BTgTWLDxxWy3DNeYsy3tahaiGsLTpXjgtBY8HKyviRCD1vGHHL%2BNoAoEJtqRjLs38dVWS4IySVWqrPLuOdZHivmVOQLLmKzYK9q1vGEXxIwNk1gOuF1LBqaJCSyfHzb7YKZfn0KxdjmEB7vBiUgfGCN8OwlEFY4eqdklFh6GqQ3AHaniptQozM3plHicQ6qScrNFBmFJR1G%2FxSuTdN6Q13jTG2P2%2BcK1HB7NtTz3PcRy3GDJzdjOpMJy6bBj19jMDqVzk00SCRor6EVtr9m1eT1M9pLDIn%2BFD1t33HHVVZsPNrd0Ix%2FYhW%2BpCgSS7uawQIRvtQS8p%2B6EHFe0yBukCY3EMga1vJI%2Bl9Su5TloSLq%2F7rim8v9kMmshLNjrOmy0wneN8apvuMMINQJIgjBnbf0dD1kTPH8luTjYwHrqjqs2DwfgTk7QT5SzCSTUpZKyDUlSqTrz%2Fav80i%2BmllfGE4cJ14Lte%2FfXmfh4dnEGsxbCQtUXZsP0BGQ80zIIFxKC1ak9uPWKd9RsWycYJ5PX2PPUdZsHQsSmpbMKDZYsvEQCqutYuZYqj76KkInHhJth134hlsOHx%2BDzeZXSe68FsNyLNowl%2BXNLSjN6UQhgWTpsrJiKxKBUOYJzuuLxVM%2FW9WbisOTiScbWiwSD646rhkONjQqNHFkRkC36yoZ5XlZslV7UnWwWlqNjwcKPGHOxaNfy1u2IxcTHB5ZkMmuhFgtfwbDdv4dnW%2BAYPo4x7Nl6hxoHraA4mCggyOQpjkQxEetXd2zuq0c0LRAHJOX%2BF03d8bhugm%2Fhs7EVLM1vRCP2xpiwmJzFSyzS4b91lx0fQ%2BWlNLOXUPl9hV%2B0OiywtQJ0AkjWf2BN6fbmksaS2Xqhdf1Vw%2FX1RAbRRPgspJX2Dn6E35MXEudYdVkfXkClW2A5sxXTYnnDTlpetbBAfHw%2Fi4%2FnlGbUtRAWbKvUDRYDtXCqKNy8a%2F0JM76eyyWdd%2FmVkoxTLpLLg%2FC89uCvrgoCmEbSTMBqrdDVY70FFmGzkEzpJWSMmLJio8ZiJpO0xYJUtGt56y0RiB2YHuGxaA0v0sXKATBeg6lakIm4VICDeecDmqCKZ%2FFpvaPuf1AB2RnVgmQefPC6a%2F6kobK%2BO9oZYZUwsykpqYSc7WGuNB%2BwvHH4jKnLKxaWZx3DXrRYvoY2zARi%2F5zZ8FhgIeeC1guEMli79YoT%2BuIHAeCTEytgOe5JcSwk9JSxY68ZJtzDIJd73n333XXfbK0nN2Nv4Xe2qA0wmwjfLNbrrjfeGIPTN017TrG8xMVCgZipH88pKS3L8HWggKVi1jAJpWkEmcj1yYo127ZtW7NtzZo1CEVyOSEfB5wP6IOuGLLJ%2FOo1phiSy53v4vrpn7SCNYtKMJxKxDS4Wtev8i0wzFsYlvRcpFa4WA6xM5MqDkOPfz%2Fz%2BLkZdi107MhXkV8z0Nw02LMeaSCOVWJtW7WNqKwhtazQV9lIJg4w5maVd556SpGxxYJk1hGW99%2F%2F6Z%2BcRsl0si18tQMWcnTseV253njXs9KKiYKlJ5WjKr0%2FOppYAMv3QCym9EIpfll5Zm8A98OFYAO1YLw%2BWbPtpFirFBdcpBbDRYHxUgu78uadp1Ar3JqRz3%2FttWtILO%2B%2Fr8CAPrhnsXsrWqwJL9yGdd%2FwLJMLnWx1a%2BWoanA1OYvl8JVY3iTXctwrxc8cFnAus7acPHnqpFkGCpkxy4opE%2FaJrRfpjXSsIAyaUy4PvvauxgJguk63toKTEe0uPDQmwXTTjbgtpt%2FFaKW78YZnn2VWjGowjiW14hmG2WK5F22YcS15JRm2YUIthRepduJTCg5Xy7Y1Ui0AZgVzMA7f%2F8EJWy4iwH6KexcQy%2FWE5ccCyzUPXhdsO03eX0kFw%2BJIyJRcWqztYkOl8RvPOuTihcWmIqIwt1gcriXzNkwMF%2FEVZf8NZ2LMmDBiUi4aiuZiexbHrV3vfCBjaCses7Dc9yAEzIkGAmObsFDIFRkzE4ZYNryt5SK8y1FvrRzWYdjb6cTicC2zSzNtw%2BQoHl9F4Zf%2B50a3XNDna7W43YvF5gOXXgQYKZlfWVi%2BIrBc9yCuq7obGupDLSphoScSYvXJUMh2LEilsfHj0eWi3P3Ro54mjCUtzqwlL9NxmMbiq5jz7rsIBomcSsNF6eWEFY%2FZSE546QWXjUVQ%2BfGDYl0%2F3NZQiYLhdUprvgtXS6PEcpMlF4dejo5qwhxiuR1tWL%2FThi3LnA1TQxF9vjx8twCMMWSGiw7GhNtfceKT9GrRYN4RXAyap1xY1j2IaT%2Bsdeu%2B2UaCCdnXrat5bpZYBBSFxciFgTHO3qJil45ft23YzexYS2mGbZjEAlasQBiXv9yi5XKSx8jKvayw%2FcuJEx4O5oS3XiQYFohdJ9XyIOQy3wbB1IdCrkH63a78XmG5C7A4zRh7LCrasRzSJsyIxWHDcjNvw9RkV5%2Bv8K%2BkKyYwTrfvSl4cYD6QH7bnf8ci85AAY7CgDRNqwVzmmm8KSxZiQ3XN8MNuF5XWG94WciEuTjBOKi5%2Fz8Ri27B%2FngY2TGHxk3OREdJfrnWZsTXajOlk%2F4Q7d%2FGIxywzhmieukYHYuuUWB4USr2lo6Oy0atB38KifcuGt99mZkwaMr4cVA5Z%2Ft6IBWzYXhaHzcl4Lsmx%2BHJZ4HrRqjTu5RMejdlQPtCpywmX49dQ4GWwXCe1IrG8%2F%2F673%2BxoqO8OuZvBrU18zeU9zsVJ5rCJjB2Oxa6GyTKl2S%2BeNw1smL76ADbDjHX5ypKlnwEmlhVTgnHULEdPKSmj%2FMC69pawUHz80we1EVN%2F9I%2Fv7kBDZh1ctZrDLCw3ERYVjqEdY6%2FDDm9vR2HSghEWu0Psn0sznkvaWL6ksXy2uKRk0T9tXGXVxpQd%2B8ShF2cwxuXyjpML6GWdCsTuU1AevN78RNzSQIIJuQa6ScUYKPWNNxx6W4CxBHNY1SYNlWeZu9cpi6Ly5g6r52VO6TSwYeb%2BFl9Rnn5vvgReD371I%2BKCNmzVGpZVWgUY7wL%2FCTsSs%2FTybYnlK9drsTzI7OctvR0dyMXuDbPCY%2BHz6xu%2FobAYLocFkKPcfjFv70gkn3vrubeczRXzp4MNM1ikFeNY3v3xQeFb3Nm%2B7V4%2BcZsxKxyzjNh9Er5IWmjD8kGrHnOwo6Oh0Sro29GxolJff%2B8hphcD5rDlVRSWVw9ZjkWJhRy%2B2S6%2BuHg62DCOpeJLCgsEI6Xz6Bd%2FuVXbMLUj9omjYOncq7S5vCOtmEFzlcRyx2u2WgSV92%2B88carGBfNJGRTISx3aSwOMG8QEy0V41ccjkWIZS8rHs8tzfB2sY0FU5c89eZAUah0iXz3ZspgbA3bqPzEGY194grH7OSFm7HrhDDWPfTQazoSu0ZjeffnsK7%2BZjU5GJOzOOouRKWx%2FgZ8u5khs9ezTCqGisPfv%2BXoPS6eFq6FYRFWjGIk6F0rLZFYlsz7zDatF7lRucKdUX6SPhh7x5HrE5av4N3ESOX6G2988We36cT%2FyodxvfjNauNgrF0WTqW%2B8Q2JRQjmWRcULhVvKvfaYrklr2TaYcGMEn%2BQP4tFoZK%2Fou8hMCnJ%2FlNhyNZs8w7G3G7fsVFpUYFQDNh%2FG1P%2B6298%2FGc%2F%2BxnIw2D5GWF5%2BPm7qztEpOwVGUsq9fU3HTpkg7HW2xrLqzwIe924exLLXtYfdttjedMLC1qxHIHlS3D1UlnZl%2Bj7JWWgnOJFl29j7RZnTirdqT4jcx%2FYq1ve%2BdX1oBJiIrAIj%2F%2Fuw3I9DlzqG7nfb3SJpb7%2BhlcNl7c9odD%2FntaCkVi292uxXPvYY4%2FllUwvLJS64Lszl7DMxR9q8W1ZGVoy6V5WnNm9WJn%2BO3oPWSeU7%2F%2F0%2Bhv3IBNJ5ee3qh2YfZLKEw8%2F%2FE9D5PjVwQkvKhCLvWqBedshFO5WbK1wsRjPcg1geWxpyfTJW4QVyyFbkgMcyssL3kVzJqiUlZct%2BB%2FcjI3mXrwLyUwv19%2Fz%2FM84lJ%2F%2F%2FErp8X%2BqxAJcnrhvCBy%2F1w6YoVJ5FzoNw8WxDjG3YrTyptYKhWHbWUP4Y7RyJZaM18SUFSuaA1i%2BhFBgzX3%2FswXlepUtucgEY6O5F2PG7I19VUcWQgEojMsR6VquNFAefkJyGY1K%2FQZ81w9xxXhAsf0Kcyx0DwUTyy2PEpZ%2Fy9Vy8U8DLLR3%2FP5nc5DCMlgFhfCJvsPP5WVL%2F3RNevcyms83SeVTEopDLU8LLD%2F%2BuVELrnuMHUvj8%2BvveulVJRgAo9AcUj6FGTCmFSWW79tieeC2Rx8lMP82TySUmeNiY4Ftl9wCSQJ%2BXpbpRd%2BWF39mjVc45orG3IVkoRZQys84FM3lZ8LjM7E88bDm4krwabcFHsTyDXjXX2VkrMWlYlN5Tvt7HLinHP5vYBGZf5uH70EG9cKwkFwqKjSICvxFxTL6Kv952YIVHjv7Hk3JrvI%2BQXmeKYWJ5WEIxX7MwjBhwrRe6t2Fl3rEglRaW296SXI5ZIF51TBRUJxUnqNB4f3mFOs1v5FcHn30y%2FPL6D8cKjD%2BzGNZDr0WiEIw8VX4JBIfvVAw8%2F5mzRpHiX%2B0MNmQeej6qzUUhwnDUAzF8jTz908wLo3OfUl61QssG%2Bidl4qReMwvPKlIG0aTj1uNCfvBR7AUGc3Fn6FjR7ZcFAr4Kl7wSSwJpuQipxlz1ffd4RhEX1c7mIhHiOXhn%2B8xJoxp5RF4tF4cFkyKpbX1rl%2F8grgwMgaJG4ryK8KEBZhYbvnwIwbmy0vIjmXIv1hYhHup4DBoQS2VhORDLmXZv12zZo21r%2B%2B588L9%2FkM3PvMze%2F3cIZcrf7rfQytPSC6IRHFpNVRobXj7FwIMJ%2FMSg%2BKkIsB8DaOwWDWbvXPlh7A0GcUlM3pxYqHmJFp%2B1%2FJJ17Pkb1ZwLqYl2UMuJ8h%2B7dnjxeRnP9dqefjnXlBQLY88cp%2Fg0s0MmIECUfIN9N6%2F5F6%2FsKDYVIRjOd1vqNyyfz9yuVIr5stLMudfbCzL6e1fLj%2F0Yp7HJw0ZM2KqbczVbyHZvHP1hy%2B%2FvO%2FIvn37nnz6hWf2eIkFqfzcUHnYQAEsj0C%2BX9mIVowbMhUhV9ZX3v66APALFxJiwqBovyJi4yibj%2FDArfv3CzCCzEfIpTxT%2FiXL%2BQ%2BcNNwhAYApWyTPvFiHXrzdy3X76b%2Fyow%2FxoXXkyJOI5%2BceYnmCuxaF5Ym7gUu3MGQSSb3KKBHLhkOvKzD2MlBstyLdfbRutfEs1x45sl%2BDkVz%2BtVj7l0xjGW35he8BLoULVrj6xjzcC1C55yO1DJcPP3wZBPTykSefedGQcZgwrRVYj3%2BT9MJLYowKmDF6%2FwHN604kHIo2YLLoUlW3%2BuYH9ED9dfv2HdFkrpSKIS4VGbn6YPk5gIGfoWxXV%2FIJjwr%2FHVemhSLXkaf3%2FIxZMNvdKy43Ngw11ButNNZbVCor73rzzdfdKx2Ut%2B7dgUEY3CzNouN9uI44JSO5%2BDJy1fS5cClfwHIX7V4cJRgjFcnlI8WFgzki0DxhsntCYqg88sjVQ8glHZXKytvx7X%2F9TQZEIlFQPKn0m9sn1j355JMczP4rUTPApSQjXLLO%2Bt9QEZng4nG2Qq877uRQjFpeZnI5cgSxwNr3zIsP21LRTB755SO%2FpPTFUGm0oFRWbrj3Te%2FlhvLW7ZqKcfgH9j399JOCzBEumY8%2B%2BoLiMqUdF2ePRXv%2B8kXOQy%2F2SdfrrvzoI1stRiwvM7EILhiqvfAidy1cLTIcc1ORXBo8uTz3nBcV8itDx%2Fr70YZJtdzywgsvPE1k9jnJfCETejkHLNqQFX5mtIrldRjMeFF5mWnlZS2WI2Tc9z3zvNPfk1jgIbfPqAgwem249zlvJAjEQHnu%2BztEDAZUNmmtPHDnM88Ql6edtoy4TH26fy5YlsvUctmSP7X6%2BSz3cs9vfsOoMBtm%2BxUuFsxsYO15XKpFQRFcbuwALowJINFUGiobGjbc%2Fpzn4lDe%2Btr3gEqstW71akss1%2B7Z8wyCkYp50nb%2FyGWK5XJ2WPwOvSw1WeWKT%2FgQhTvu%2FM1vPnLaMMWF2TAbClGB9cLzzHoRl18CF3D7HfW2t7e4NNzkgcSCAm5lx97tyepjqxHLJjNO%2F849ewhMGsl8oXCqs5ess5EIz%2FlFsfki106ldCtIhclFQ%2BHuHqBIEyap7HuSwDwN1YAXbTC%2FRDL3QDhWaZJ7Y8EICqwbvuZg8pwF5Wvf37Fjeyw6dGx1P4rluL5C59oXX3xxjyRjgRFksj6XPdV7%2B2PF4s%2BZm1PEwZBeli1RG%2FsruNO%2F7iPLggkwXv7eacEUFVwSzC8lFPx0N4Zj9U4sDRpLw4abGAVOBFvAb99KUgEDRias%2F4C61uiBO198UYJ5Rtqyf%2FmXf%2Flf%2F%2Buyyy5bunQetMmXlE21cxkjFuhV%2BvFnC3QJU%2BoForGLRPJief3rqNLnKRZB5UMLChOLWEQF3hwBRnFBQ4Zu3yUWDQXXN24niTyXBkrb0DGyYCI6lvca%2FeB5XIzEkmJYQAM7LKndZNlUO5cxYinCVqUvFVVUSDA6gVnKhycJ53KPg8lHdn7vDsM0lH0aClJ54YVnXjQWjMCge2lV%2FqWVFheLBPPmW8517%2Fe3gvlKtg7VIZV%2B5fClXP5q6VIAARDkKitDHKWq6YdRmWZY%2FAXUXzdf7o%2FpmjL0ZLhyl3t%2B4xJLGjAOEybEQiZMQHkBLMrzllx%2BeR9m%2B%2FWcig2lo6GhrW3DDTfdyzzKvXd9r6cnFo62IZRjq6VYNmkT9oMr5xWXlkggZpWXyQ4gam2YlpGYby5h%2BRJtJvvUXxDlQrkLd%2Fp3ejD50CPBV1rZl8aCIRdcex6XRMSXu5UZa21VXCpPiyXJtNGqvOGGu2B9%2F4YfxWLhZFW0tQPuZjp2THIBLObOvGse%2B7%2FnlRgoEgW%2BTIcJ%2FjQun25Y%2FGDDqDclZ5lVUMVGzIsstVxx529%2B46kWnbJ86HD3ioriYiyYoPLMnhefMGr55Y1DgouBoqicZlBgdcBqOA3bmK2tpzuGYMGNWWjCFBZ9CdgB6kCSVAiGwSGZKBsx3bAUymNBcwqFnH1OLMrB3OnB5EMjl5e1XI4YC3bESIVRETYMuMBSgvmljJK5Vk6ftsXCV4fAo6DUabGsXm2i41sek1wUFdX4o1p%2BBJSp3aMcG5b58vzeZ0v0%2FrZsxEQjphsurrgTekbSgeHR8X4ThVkZi6Bi1LIHH1gkGLkwSvbQihtLB3IBKITFiEVEYiY6Fg2uX15SIkOuZRqFaPhR7Qz%2B6Vaq9PvnqmOV88vlJQ0KSwGfznenguJk4kwl9xsoRxxQUCxPa60QFMCy53EtFzJjBgtPXiptJkRFqMUplk3y7uIDB255THGhU2DaZFkdJp6btRnHslwfQp4j%2F%2BrK6RdlrzGTFEgrSi0feYRhkst%2BU84%2FcsTpV6RYlAmTXPa8%2BPwjxoxVNzipuMJkooIPU8sx5Vr6V%2B%2FWOy2PPaq5mATFdJgs9089k7Fi8f2VwvLZYn7IwF9UYLr5OBVmwviuJFLZTxZsPyHZf4RnLE8%2F7XQsCgol4WDIjBmrdGWUDq0oKMy1CLEcs8QC3eCy71hwUa7TnxkaZ4WFT1KYry8EgCy%2FqGCROICMYJCKEctvPNQC6f1%2BZsL23%2FbubcavPM25KBMmwLwowTxuzFhbpRuLt1hILXWWWFav3qlt2KOiu5W4%2FGtx2dQnjuPAUmCwzNVXAPmLigqy1ZieNYLKoy4qtlRelmIhLHAE7P3HHBZMikUFYcLfS7U8rw0ZnrCotEuVlQ0eWmlTYhmyXUu%2FEctHqu1YcCnPaOfxWWHx%2B%2BabGWB0%2BIV%2BoooKC7LNXKt74D%2FsUa84jG%2Fg7%2F%2BQUbkVSf9YY3na8izG3xsoL0LhitXG0np7WyzaiB0zcdhxRWX3raqHUoDJWKfLOWHJM1i%2BUiJGoAGUnEVyGgxguQ%2F%2Bm4wRM1Q4FCAiXkeUWCAVutWi8sLTzpTFEsuLisvVVOL3FovAoal4JC0gFrVX%2FKHuoRQnKDLV6XJOWOayiXnz8WRhIUDJ%2FYyZanUVUnnM04ixgj5pRVG5VWSo71pa8XD4NhXFBZOXURxLg4cRO6Z9ixHLlVbXMYLJUKfLuWARo8YkFjjkWlJQkDN%2FERtqhVQEFkPlNw7XAgYMmOzfj%2FGXFAv%2Bjl%2FxMmEeVF6UVJ5%2F%2FgmdvCgsbq2YSMwWi5DLbiWWa0SrHj9A8egXpgWXsWAp4li%2BVFyQA1D%2Bh56ZuGrbevKXjz5qBcgeTXskFpmy7Fe%2F45UuKi9wx8LV8jzjgqXk9Frx9viSyiYllh%2BoJoor%2BQmKacHlzFj8VKjUWD47Pyfvoo18luUVtz5m2zDLtSixvLxfvowNo9juNhOF8cKxzlj2GCgCzOOCS4M0YzYUJha7HMbUosWyTuzVf%2BgAI7j4fNPjAPgo7XoGy2e%2FtHjWWj7LctuKT24V2RhPW1zx8ctKLJIK2TA6L%2Fmu2WRhXPY4UkmuFsHlnjpIXryze2cYZrmWYzqV%2FMER1URBLsacoJgGejkjlqKCgty%2FEpO%2Br%2F1mfO9aMfUVPwMR3Li%2FU1J5jAdiDir7CYr0LdqGEZYfu%2Fw9zyOlWgwTgPL4448jl2%2BiXFwZC8tagEu1Qy3IZafpbzXdLeRiNJjLSsrFxtJ0OADunUpmf6ovccs1t%2FzJN2Pb18q54idXSSLUDyZLSo%2BxbFKC%2BfAjVjlWWiEu%2B241o8OPPOnhWFQpbM%2BLdhwm0WCl%2F8Y68PoWFoLSYVVeCItKJkXSosXi6gczYC4ryzCXrDO5%2B8Ls3qbavTu2IBEwWyvW2DeEXGdT8VQLZZHCr%2ByXmyy3GWd1q719z4thbndPWsH1CAbJ1Q3eSaSbyrFjyojtpKQFXnc6%2B8E%2BZGAu0yUm%2F7RUy7yL%2FoYfKXYOrbhD1V8ffcyqvTjCY1KKpgJcWAxxm6LyNPf3z5hSmEMskoyQi7uWr4KwBisM0%2FvFmErSupa3UNrd4AjmsrJlGb6%2F5Qy%2BZf6Cz%2FDBO3ZX%2Fq2PcbU4Nlu0Z6H1sqayb99%2BNjr8XbZ9%2F4xTLMKzaCZaLMQFS2OuXbA22jduwDhsyDJhovRyXIjlwAHVdew2ZSIqu6wsk3I5IxYsfhUu2LreKZgTzN0jFA%2FfYmzYh9KC7Zf7xLcyLD92bkmyTRZWDZNUDJknKKf03MdHLh1uI4bRsRLLLaaF0g3mQ4vLtMRCoy3Kl8wKwu2gzvnHVz32GOfiyCVNGCbkoh3Lvn23sZmh7z95xvxeZyxcLcAFcso2xoVj6ZAlfROHUXR8XHmWp3nTsQeYDz%2F3uXnLMjdIdCxYsNm4LB8uZ2%2FqgQvEjFzueOyxx2wj9qiHWD40YvHGst%2Fb3%2B8xmaSiAlA0lyfA7T9iy4VTUa6lbsiI5RilkrTWmeZWc7Llc5%2F7nO5wLYat%2FWmuFjrEWj7v0iCuZlSN07F4xmGSihILo3KEX63z%2Fq1y%2B95KWTzDMFssJJfqNk8b5lCLMmGbiMkDB3Y%2FI7uOscFVkFhSYlYp63CdBsNFvLGoQ6wl%2BQNBsXoBzRUmY0nn8i0jdkQbMenx1YTd929z7H7ZVF5kFsxB5fEnHiEr5oYi9yUdScsxEgs6%2FP8pSBSLhc3GosPVtFXKbgvfdMVCXMSUhPJ5s2oQSm8vfox8e91ttloEF7tjzyUWXLc6sTgSyWeYCbPT%2B%2BcZEzid9Mh9lLt4VCtd%2B5LHtFgOHNi9RLcbW%2F2tjgbXDBZgxlJBxt58waVswa5hkgty6e3rS9y9bt2Z4%2BMPjVj2ERgeiEGE7GgNe8ZLLKSV522tABfc1vfC0sE38XV4rMQyt9jRccwbXMtZN%2BX0DZCX6zN5NL5i3qzNPSPBYCoVTCEXXHd%2Fe926W12uBSsvV8ro2IhFqOU2B5YXPMouHvk9d%2FfIBBcOhGlwUOlocOeS6O%2BVWP7WUClXJMqXWT2uotl6emMRZ4t9atLb5s0HawbRloXhASwJWgDn1vSeRaUs%2Bzyw%2FNTRV8HKxozL4y7HIuXixsLaw6x6mKy7HLjtsuJS2dvqQGE6XOWUqOlafHGDKS9evHnzruGuVAq5hHsTegUEG7ZbfCVz%2BKw7n189qbF4RGGWY3ne6VikXDybXJ0O%2FxgTCww7vkzMbC9ncwZZh6se3LXcP01Lla6IjEKyeRcBmIM16GLCfXIJMslkMhBBOLd%2BZIfHVsOxjeVdt1j26PTeUyxEhcA8fvV9Xhv5HY7WY%2FIsO2XZBV3hZThJuFw1HHuMUPPJhsrl0xyL9DDC9Zdk%2F8NmJNMe7LWoEJgIXbYeuPvb377zyg%2BtDF90HD95xAuLvSc5SnqvxXL1Pffd7RmE2R0vKpdUOcs11HqUXaKwMB6mmTKzPZVndwDcDK6CmCx%2FM65dPe0pohKPJ9gKgGgCAeCz8m6kc%2Bed1gEjO215%2FzaV4O%2FRm197POr5XC5IxL1jzE2Y2Zc8JrnsFCbsB4%2BKnrDsEt3a6vMvtwaoLc%2F8OqfBVTQbccliAQbJABR8LDAkmUigaqW4dV3guROxXGljudW2YMqGPf%2BiWyvPX30PAIl4HmblG2E8DKuzPcttcnbrY3lKLRl0IRODBZv3%2FUYw5GIEmYGgNmWRhPyMr0BErc7OzpZO%2FIL6WbduHUZjP%2F0phmP7dWycpupy9dVI476773Yfx%2FewYA1tHa44THgW8vem9WipnEHtm35UznFwlY8GJJeXIxjismvXweFmgUWyiYhPgYCm0olXFrNbi1ui0SiM0I%2Fcjeuf7sN1j1z3ifVP8D9E%2BPydM1HpaOAmjJX0j8ntL%2Bxutbhkdmb7hGGxZlYuK8OgbNcu0AySQdFozy%2BhoB2DB6FExNXr4nJceUGuuDgnGrKvMGxs7BYj3egLEhFDwi0qbizShNknwGzPcg3vCAMumZx1PLFYlvMhrxCULb1o867NmszBYYZGQQlEhIORVELygu%2BWUKiF3cdq35nXaEaGtop5rq31ziPGeEKvVT3yGNJpz%2F4wKZZrHc2tuWXLMrplP5FYVHIps0u4EoF8zC69Dg63B1UWI6GsZB5GklGXsfIbJvXtE%2Fy2FknFhoLL%2BoU%2BSAm15GpR0je5pPIst9ozdR99dF7Zsmlpx7LO7V9Tlkz4%2FpJ5izcbLAcP4qtnoKsvGYDMH6IyTkVaM3XPt%2FPu4pDrwik9KRw%2FtTaa2a42o0qFpU1u4%2FMMX4rlFquLgsDMmy4nWiYEiwNMecmS%2FH9ggjmID6zhgaa%2BpHQwK6VYAEnEuH19AXuLfc9kFB7taqKaUKsZGu5UCy4wZoSlutryLFIsP9ivJ7caMPPKp6N%2FOWcsFOwL309BGWT%2Bl%2B7iZPTqGRjp08aMcQmpxzZmUjKhRvftIGyUe6NhosVD%2F4h8S7WOw%2BqEWGizeJ3VESbBZHaW%2FsRjUWBUGgO2bOlFTCwMjIDTHOwLWA5Gk%2BEXsWsXw64wptissbu1u7VRj6jubrVJNSrBkFrsHTAhlmv32aOObS7TSy9Z4%2Fq3%2FTzvF7bsEmbI3KtnuH0kGCcuEWbLBJyoVEw0FCUbhmCiYMGirVI47ospFJzWRmPI2ljrMVERnmX3lU9aTcfume3TyL9kjfPfd4KBgHnxLr4sKOprT03tyGBfstPOYpQtQyaYaaKLaZR4wKhF1aMtm%2BAUZde7tLZ2h1qqqmyXL8SyTjUeucAwvfyhYHGDKSsryZ7lBUWA6SE4PfQtrJrm5qZUOJmUYFpAKGIJ1XRH6WVubUMulNwgHoEJebS0BJLhwVjtwMBAbW1tzDJhwrNca2YdujzMl4szf6JlorHo%2FJKRAWN26a50aASZHv7QGq6pAUi1TeFwGMsDK4lMVAXOkhZ8g0yqYMVhDcaQRY9etT2IJWyLZfduam6V%2FWD7PATz5SXTzL1kTcjvoqMybcuAzIJZ3s5f2TMBhJgwON6rdqC2ZwyrtgegbK9NctfSvxux3LLHNOoJMFZnK54wngYHjCcYi47K9J1vSKaseMFFHnrpOajsmPzoYYQO9pzzQnDbEQwMb2VGjMTygxeohZLAPMnB4L42cSmZVt4la8J%2BJ78qLhswoJni7MX%2FcDC9Wg72aCJcOWdPZLtRS22s1RYLmjDqbXUKRoD53Of%2B9QtfuGxeBltbJxML8%2F7MmKFm5i3wQCOF0sM%2FaSTnpJntSizK41MuSWK55Xk5UVeCYT2uYoZr2TTLXbIm9rdTGaavwiJTVrbEjYYbMzeKg%2BdkxkgsASaWTWTCnsF5uoqEPcSVOlzLy8unyQyeycEiFKO8DPcz8CO5JHvRRZewDMYYsp6DrmcMcYCXKUMsHU6xLCrW3cam39juqaQCTMUfphFzeBmbDImmpKR46YLFsy7hojHRMqcwCpBLaF26UK1LbbUk2VbLJgzDLi62BhzbzcZ6PGXFlF%2FSMsVYvMksK1dsiM%2FS7PzFC2ddcsk%2FjCoAfP%2FxnV%2BUn5%2B%2FYOlStEDqB7%2FUrKWXSudSy8Siw7Dd80p5c6uGQRIp5w3Hf2h5Sxowfp%2FlZ2w0pXSUhN7ipXJl52erb%2BcxsyMPnZRIE4Rt9narfUk%2BUhmAB7BEnZ7lmnmKSrmNQt6hLbsqp4yK4zbPqcViuRmfurZa3vJOcMrLnKvU8Qt6OQ87lIl%2FU3wIyiWXCG0NCBNmMnwUy7U4HbRUnyRyNhubfmPfpPeI8ZtVfaPOXsya9J%2BM5QKNrRrBxrZrZTapcvmif1puL%2FVvy69LBRPUSpybMPQsPxBTW0v1%2BS7PbmP1Hk02E2XWlT4ZnanEYolGjhbmshEv%2BUhM5eaX7O13zvJmq0S4FjRhKauoD2LZfRu26sF0UDHMcVmFZ7vxpLdTqsuHCwvn5%2BXNnQMrLy%2BnML1Ss6bEg%2FkNGh%2B7732ZIaQwGVppV4VtheAKTAVFUlGu5Wagcq0Yq4dcVBDsfWHzJP%2FX%2B2AyXt6ci%2F92J63dYl04e25OYbkXmKnBYtD4XWwUHnS%2BFeZtd739FRXO8w7ydym8REXHyTatFUxa0ISpgYf%2FKicFi97WqWz9RpUUFebN%2FvROuXabB9HMmV9ujjj5pxwLQ6NvGWcWvsJr%2BZyP0%2F7gb7FImbBom2mtqBNiue0jw6Vcb6r4p%2Fa%2FuDB39s6dBgq%2BJB2B5uK5hfLkgO6GnlosJgzwL9dWzX6T3abfufhZB%2FhBFP6%2BpyfceLpN7%2BGDWFbDf%2FAtrFdP3hs9pXUv%2BKOKcuaQTo7LD4%2B1e%2FffzilZZh0KzAAWV%2FROkJZrA6cH2zsi%2FOV%2BjyWowLU5Ubj3qMMhlh9cyVvCpnw6KPztinJmHz9%2BfOdxsXbi4w3nn3OtPvWMYXHy8TFEXgTSeFJBJVbVSL0VbA8fxXKrPe9wirnA327%2B7OOuhWwIlGXYdu6cW8aqpZnHMh6ehZTex1q6u%2BtbK9us1uPjYMLY8DYcpjWl0w5BKl5QaN28adMmvKBs06abGZ25ZaahIOu8ZbK8qHD%2BLAjA4tAwAy0vlWpUlVALiOVafZW3NmVTxgWgFMzxJNK%2Fum6IrTq4XHmT5JJr%2FnJZ56tQwEIsRCbYI4ONYqdFM2WdFsvOK%2FkcSovLpPe4wF8v79M3H6fnZvkVnk02EpwThD9FQ3WrSTMXl6l%2BtfMSCwWdSxemAqJxCfrGGutP6649JZZ1dg%2BlbNOfEr1A%2BDX75ps1EMUE5jnBX7F6qHrIuUAzaM5K9GUfWechFMiYF1yq28mwcQ%2Bvn6Q4rE7K5fjuW9JMO5x8vcDPzFzFRMK5%2BeZNdR3OJc9GqXVs03E94H9qsYw%2FtSbrlbM4JPr7QlFq6Mfe%2FcoGfjCvf%2FcP9j3tmN12pQjKaJruZOoFqAipsNU%2FpA4PutgY6czIL9N%2Fs6wpRTLOAhRZr7yZeOxSdpJ3Y38yQmnrYNFx3c7ddz7t6DwygtFTjidlK9Lvn%2F%2F3DiirhzAc4XNnBaN%2FnLkYdvfycHspF7eWysqnGgv8jMPIy0LfOW9ryOSxcMEMhEJ9sdgHi53JmLLQETAdHvfvXudoCbPIXFYyaUda0IBB9HszPrg2kVLwNFTl6QZ10wycjpqxeMFSs8XKr%2BmdSiwAJXfO7NlzC%2FUuoP%2FsVQZl8fx%2FRCZR%2BiT8Sqi1m7B0cIe%2F81p1k7fpOuZtx5eVTZIZA7c3G3OSm%2FtvJjjwbd1pM31Wrpn5S2werNFjCgNk%2BCnPu3AT%2Fj0%2FnXuW86DYVp6vwECR7p4axuEAUuVpYcOkCdt0%2FOk9HoNb95suyssmp4fS7y%2B4EJAglZvF17q203R60BxY%2B78WQWsaR2JmmbHJclOxDebLuRjvp%2B9HMHnlZ3FBsDR9sCoKJZQW1tEvTvC1ilRSlvQRzM47qVfvmTRgcGVPRjQGef3f9xMU8dy8utp5irBx0RL7%2BuRlsrtAXUQq35rJxwJS%2BW9qZDeY2rnlqiPLf0acvsLshTNnzJixMD83f4MhIrMVOtICx47q6WDekK68bNr5vGyiZJZMRcs4vfUL0MU3CVbM78v9834pFqJTd9oNRTMp58PMKszVsFNUE%2FP7slXmfQy5HJ87xrOKfn%2FOYgmhKsqRREUMFhKDFeAc5ekGq%2FCyc%2FeLz5vm1mde4J2tqo1mEpyL359Ld1iLBUUWp1TqFxWXsKF%2FyzyGmekZZlmTrpW5ptAguOSN6Sy8v2gBg6J8vFhV4bCAglzAszSYEQnApX%2Fn1XaPsRreWqqaa%2FRtrBOIBYwC3P7ar8Ecq3RQmTnPhlKxzN7ps%2Fo8sqaICt210lG3etOm48fnj%2BGsoq9osVMguOLb6W4MXFvW7k2KI8YOtdStnlNczLqMS3mrU7l%2BVybWt4AFk9f0iVXnGBxQn19SytuiXFcnL7dyusnFAhU7LDJ0dLRhJl5f2QHl0k3HP73kjLc7%2BosWt7ZG77fIRGMaiVpb9kbhP75SZ5Myb7nYij9NR5mZpVsxRv825v%2FQ5YJKv8CyuqMeJwfJc%2BlAZ4aSivqZML0ey71uTp5kLPOxrlvd0QDOrx5%2FtJHL8eMXF2v%2Fku5nL7%2B12xZLcu8pz7W3G7GIipgOkYstz%2BrR0iTypwlL86Gc%2Fd%2FkLdZkwE6L8UFirBOsmUu4VGSL2Gi3WE8qFl%2FBDPgpru6Ayd6AhSZPDa3GrZ%2FZZ6hL%2BXJB99FWc7g1tvZUurUlSVysoaELip2u1epmmuhhupAC%2FLW%2Ba3Q1GjA9boOoLCy2oPgqztgtOKnNrr6FVPvBMfit%2BLPTXV%2FfMIRyOT63RN2M7PVX8xfOUFQo6Iqnh4JrO9aP27gVu5BPbk3T2jqRJqzg79XFvLCG6sXsIDXIoX5xsVMqZ5z3lzWp7r4a3iyYKkFY6sUEioY6lMvxeeXlad0LORbgItL4UNWOU2dY21sbpFzqpFzmERbmW53TW0XLwERRufCYuZp3qL5Vj9pqtKioQGMMQxgnE0sO2i%2BNBdWCSXnbMZTLp1XblvtvCHcoCxOG575D0b2nzry2O%2BUyu6TUbqPk7UwT3LwHdbBj%2Bp6%2BY9Xw38mgNLYu5FREnHHmPzprEk3Y7OrqaokFU1wxwq2xsrofd%2BJml6Vz%2B%2F6CvxBiwVw%2BtuXUWFay8rQ9k3oeYZHOVbUzLZ%2BM1lZ%2FUb4ctYyvBjlkS%2BtlpqBSzns6l2cSSx5SqW4TWEAqsHcF%2ByTdjQ1DKBftXpxvkr9oJkKhileAO5XRAG1prDxt5S6zhVoqWL%2FxZOUAuWaOv6DCp9PNWFLKTguMeazM5B07KppZLW0YYemOtnRWVcH0kG7IKtG7HJ%2BnJ3g6snvQFk156d4u3%2FS125MU%2Fka3p0Wzt9KRVM4rLSufikFh%2FoK%2FFj3PCKaVDdmiKmr3PKaVs4gyJg2LL1eIhYxYa2MoWhXASe8rW0KNDR392L12YXG5e3QE%2FPABRBpcGZWufm%2BU9SSkBRNALsy9zCz2pD4JP311shW9rq7VNf9sqfYrZ%2FcTkjWZYhEWDKlAZSsZj4fjiWSkBc0YyWVOmTt78ef8BVow8CpJAWBLHOdPkhSo8bstTQiwgwbvsUuM9VjwSe1xKVxUpyqxda2hKBtPi48Mwsr1GOzlmcaSU01Y4O4uKLx0I5VwKpWCITud0e76jjrq%2BlRmzGTb%2FsKZMr2PbRRUqigP7YZcALsoAE11LI3XRy5sR%2F%2FPlrh%2B94lfRXmm26aVegvMfK3Gxhmaytn%2BeEzWSePliwQWKRagkhqMxZoGkUuou6EazdhxacbM39hPBUooFrdIt7KxSgRwVMtvrK9EyVRHPQ3ZXiGXau1eZpZOulx8BX%2BmqTSKQWgCjNh3WGqonGWlZ7KwFM3oELennSYqgThM%2B2qKfWokFU8Cl%2Fo2acZKrCgZSmEB0T%2BhMshwPWGh4WItSKYSrVmbZ4IZlR0wum0%2Fv1RSnzS9%2BBbrEKNS7wJJLtHuxbrWcNZ7CJOFZX41vD9t0t23ABUUywXzLm0Kx5MRiMaqj1FLbi4Pl2DHrC9AeysqLt5BpYFuHJcoB%2FWFGsmWeTmY7fWSi3YveSWTO7a1KFffz1upRqBGqTJBepGx8bn8DSYHi9%2BfL2KwtjYIjXEyXnhwMHbpktJFI%2BBeIhAld4jk5UKT7Pv9FbnBAL73VWuNAOq7Kd8RC4cohrrr0bNvd2NZi1hMOIbvV27ZpI5tLZihtvgaIPdtEfPo9BjU%2FGJmws7yz58kLMtnylTydL1w94OpwVnQXbB0ZBDl0tLdWj1EcplTahxibpCGiia3GHfR2Ig6WRlQdydEgEw36qV6u5cVo60XFU7fD25o8RKzETnh3UdFi9Qf1RHFSZsKiaDzj8UsYzlbMzpJWIo6RJVSuPskmLBBqg0Vf4q8fktLY9uQMWOigpfbSyNF48ahx%2BthIOjKQDKBd8MkkQ1N6u%2Bub4Am0e1prBi9VffDU30%2FPG2LiifrOhB%2FboeI2YeG0CHKwbTdiku%2Bjo3PYWNncrD4wLWgWIS7ByqpQQrhS0sWjjSlUC6hyg7h9S9UR4Dn97U4qGwhpdG%2FTbF1EiePAxyIsKHTZcjFZS9uIJvMs1qsGbmTM5TKVzhDVeGifC6tHOe8QYnlnHoGJgWLv2IuePy2aqQCjgUzlkWyjpo9MoJyiUQhp6w7LpNK%2BLsvy02igWpJbWRvM%2FzbEFhTZA2xdSoRENeOdaJeqt1ctsD%2Bp%2BjluF%2FoBeUCrwVlk8AFi0Ty5mRxj4NjLWKJ5Nn%2FuZODpWgxlsMgNg5FBZV8SaWsuAvk0gdmLFTfMbSazhpAUlleNrcbx4lrKicpOu5uoVhhsCk2InMelEsiAqFcPf6YOrlEGyksur9OqaU1mqyKtrblT0KTPtS5RcNNR7cKEq21xFA5h%2Fh8krDMBCyQ3YdIK%2BFUthlRtLB5JEheH7wLRGPA5eKSspI53TTnPbzRepdDVeiVUjGYqjsSG8GB1iiXAHgZyEiRiyNOjlNb5ZCSSmsY%2FrVaeFL5JRM9F9xfsQjCPtRLY6fz0hNcC4vHI5ZJwlI4A%2FPI%2BhAFYeFPLS3RddTyBbW1IyiXCMqljs7kzC2eHaKL90grJ6VWTq3tjqJfAS5gxeD9HWlC64dYoOSJBU94%2F%2B28MiaoCLG0JUeaa9sHBmhidfZEJzD%2BHOzmhHC8stN5XQCtpcaznEsyO0lY%2FpGSe7Jg4Uux7VY3SBXX1jYPhqlk2TA0tJqOG%2Fx9C12IGN7CLBi4llAV1dEGY6kYgaESAXBJQmgWgEoBRkHWLn9SigVX62Bz7UBNzfBwDzw1tUvLlk3k6Fa%2FfzHeiQF6aWHXOJgbT%2F5xfGKZNCyQcAhvH%2BZb2TjVZWEtmLG%2BRLIT5TJEx3IieDFSALVykh7xdXs0ILAMCii1yorBbT0QLodaUS7VvD4WJSwEJjrSPjBMTHrwYziRWzaRc%2FR9OVS3r6wMdVpqUfeeLMKfxHMXy6QZMWxSBSpxZcD0lagV2bVojuKY67e2VUPDxbEk3ViFWjFM0FNEkxJLDOtpQKYpLJxLAv%2BNALmXulbGZUhRqU6O1NYQFTWFdHhGcflZ7Q%2BeKabBvoT6xhDGKZ3yJFRI3ngGX5aWjEsskxUgz6wKIJT4Qj74TvSelLSjXIQZg%2FTvWJ244VVQ4WQwOg4L5xITclFYkgQyGTqNeomaLRcqUEIcdjo80i6pDMOL5pQmcssnrp7szxFHaUX4KIpCWi3wzCg2qeQ5%2FXGThGUBuOVk%2FNKlJaWsF1vOFF3c3t482AteHxIQEBXcIgpcgMpJWy0bMQ4LKysGsRgEyQJLUl3V141yqYvrLB%2BgoMOPppo0FVCL%2FLxo4sr8Yv8ByHRCwN7Sya46k89i%2FGEczx83OVh8FQuTyVnZ%2BryT6gyiAYlL2wfgbp1ekAhEXwm6QjyODXrSr6jXlqjGAj6fQrERwiJqMXTvqOCi0pdqUgtoZbBZ%2BBX6ILUAmJkTt1vpzxF3mbasXBmp6uyMqPtn5NdoNJs5%2FOXTBwtwKcMJ6eWiJ1tSkWN4yz8%2F0N7cFBSXhsMbj2B2SCgazclTaw2WpsGmppGRkWbAElgZSPSF%2B5ALXtbbXY0FfBEmbyEoddXJVDOJZZh0IgXT03NB8UTtVvr9i8Qls3gZ3Uq8s6SFL6h361zyXH8GJgfLcp8c5b7MdKirxjmYyzYAZqwpDFz6wuFe5OJBBbCsRCyCS0xhQYcfDhJTukS5kU7mbVE2DL4PhMGEERYllmGagv3F4vG9U7wa9ndguTDQDASqaImLgfXC3jAZh%2Fmnl1p8vgo9fVK1x%2FulkJZghgdmrLcX3vJUMJXqOWVhEf5lRxS3afD%2FAViEWqAsBrWXvuBIMNWLVOB36CMubRtFeIw76uFg10CNhHLQPAd%2FUlw6LrvCdr8WEIlOuoZWqqWKc4ECoC68LJ8%2BWCSXCt2VzcqEyGXhAJgxeGtTqd4gfBpwUjmJihFYhMtvGhwBLqCwRBWIpakLmEoqvX3daMaSECIIsSRTIgoT66Bgg6bsRxKLb7xYoLSEWFrE7cBwaSNgEWCUaJaOMw6bPCzqVip5bMBkC4hl6QB5lyBJITWy8eTJU%2B5nh8wm0d9jCRnkAlhALeA6ukYgkkMsKSATQi57T%2B0lLNHwSPOAMWHDKg47ePDzE6UW33ysSVQl6XJgfdOpuIFWrGK1WXzOBnPyZuyzwZNWJQr%2Bh7JL2sGI4YK3vYmobHRx2YEdAOFUGLikKJvELDQZScYHaymSQ7mEe0Fzgsva%2F4NUquMQhSnPYtmwg5cWT0wnDETHVCoiKnSbtnU1MKwLikvH%2B0dNWp%2BYGT3pODeAclnQPNIUFCu15SRZLZdi1gosqVg4hiVkDJEHofKc7IOLwgbaBxFLH2AJgo9CLqLbpQUSyQFjw7jPnzVRWEr%2BDnEosVCNVS%2BIljs7F47btUzu1Qdq6qQrTCv86qCkEtxhqNiKUVjCqBbK8mOwEbYyULsFIob2ETRffWDE8PfojcrOxup4EIJjphYjl12LSifGiPnzKLKPCyxJ2mdYWcXQRPJLxutaJv3qA4%2BfTFDRskXBQQGmRwtFfGJqiUq1pGQFuXYwBe9AcsepnoEauImXsPQSlmBvS53yLLXKhvWwYAzWruyJwQJH3GQumxA%2BP0H3zpu75yOR7JLxupaMzEGGjHLmIK5gqhYci1in2Gf6soWwCOcSo5XCJD%2B58dRawAK%2BCZ1LUGCRXIbiqRGgYrIW41p2bV4yzsRbOfyCuFILrkCCnIt8hGiWjDdryRCWwkWQiAQRzBZJYSP7LDWzUapFyYVcy8oI5Dgba2oGQC7hXulcgk2SS0u4qXlgoEbLhcr6FIYd3HxR8bgtC62KbKowxKm%2BinsMkSTjQpopHr8uM4GlYkETLkgSd5w8aalFkJHOporUElbOJYaupTOCxbMd8M63N6XIipFYupqCqc6hIfQsHIvUC9xytXnz0vFbFhGHLUQkUP2JS7HgjbLq2nm6ev7S0vHrMisDYlmKUIJdwaYeZreMGZN27VRY1sSUWgbDyarOGKppC7z17VQmEM6lC3%2BzIDRoNHUJLCbLF1rZtXlWyfgti9hKEj6tj9SSTKrURT1Qu1zI%2BsPOHyy%2BnK%2BOjMDPd1PTwEYDRIpFf4FvthOWWFhllGDDqjpFpbkHzFhzE0GRVqypCyPu5q4BoxZTrQSxzBvfJq6xYUv7KDTv62NY0O9DMVySWVw6fl1OORZ%2F4SxI10fgnezaeNJjafGc3FslS5VIBfQCcVhLWNRptqAV60K5COcCcmmCjxEQS7vBoisvmzfTJu4EuBZ%2F4eI%2BuaTLpwiZwEQADHLJH2%2F5OANY%2FL5FUEXpggpX01YHCPl1o8xgIHFJUigmnQvGYS1rpZZILoMARToXxIKrvZ3kYpXEwIQNLy0tnRjXUnhBOCw3I9RmHHiXCDoY2j4CLtkTYC6nGAvM5kEo%2BPR4SOSU%2BoQfG6MSCzmXWDge6IypLGdrzbD2LkotI13N7e3tVoAsY%2BNdbfmlpROS4%2FuX9PZKLDJCTkSE109EAtL7L52ABCkrA44FqYw0b%2FS0XqfYp5hKXMjno1i2qLRzI2CpgUK%2FxIIuH7TSrAIxw4WisFD1wpIJyVr8yxf0QmBOqawIkYmLeBAKGrSJSJCyptqxkK0BLltXnRxlUTy2gyr74PTJucQDLXtP6prADnjvB8i7yBBZ2jAeiREUoJKA%2FvCJyVr8%2FoUizOjtjcsQGdo9IoYM9n9MxB81tVPDK%2FLhvUMj1tWz6uQqb3dvfP4W6slMicwFomNohVVB20aQyzAEY6lgrw7FgEpXl42FTFgN9u0vUa5lXFh8FRdAzZp%2BGJTXT2LXWsRoJvl3xeebWvzzuuRq3rjKi4sDUcw4F%2FAsVVt48QzKkDUD5F2MWIRcLLHs2nywDbEsLZ2ILWPfEoISFFiEDcMYOZFIav9%2FQfEE%2FFFZU2rCLhVMmpu3EhUPMlZpbK3EAp1ikLPsOHmSlTK3DKN3aQrKzKVLysVSC1LZ3EhYFk1EIAaHO2UJLohBoMj2FRuR8ScCs4on4I%2FKmmoTRqtHQVk1SuZyCuVCWAbRhG13gAN%2FXgNbz7JY2SUFM0BchM%2FvQSqJNsKycCJ8C7TpaywQbaB3MVhoQR4z8zxTi88yYdaysLBfbUmKHgswYdsZNrJia%2BGNr%2BlqUlAIS3sX8%2FkUhHXBWX3kMmMiIjF%2FxSwsGtGuam%2B4l2WVbC08v9SCJqxZYNm6yr1QOuLFEe2g7XwwYXudgpJy6ZK7aVItyoopKsOVNEIBhgKVTIha%2FnuT2lU1WPoSfWr%2FBdfikvMJi9%2B%2FAN405NJcs2rVNm8uLtO2ai9wCcfjOzyM3VaSy4imMqLyfIEFLdiuUGUrjlcALvMmIJ30FzRJtQgzhlQISm8CP%2BjbxKLzCouv4Kv0wwxktiCFbatGJaO5bNleu32HV%2FXs1EaUy4AxY0ItA%2B2GyuYIDXoHubRVZ5eM%2B82C2jcUjoLavVCcrMQinUxfYtFE1BOmCosfO8LF6kEm2%2BSndGTSxQMuubSPiLylC4o6kOXT8a8aDMKASi9d5dZ2GgbBVC8af1MlxCwj2KPWZaj0qrqlUAp%2B5E%2FE5vSUYZkPQEgt7dLfb%2FPWjFKLJ5eN7AM%2B43a9kAsVxQhLO3W6klba8SIkxAJn0atnFo%2FbuUD5GJvVmpxq6ZUGTPj%2FBecRFqi6IBVcB7dt28blsi2d9z95RsWQXAZGumQJuRkeSQW1Moyje1pb29CMtUH5ZdyhGO5J4P4BgcHamGjrVIoRmomfT1h82YQEHfJGoCGpaGvm5nIyPZdTSjdCLjXNI0YuXcKCoVYO4kSlbrgJ6TRxaSseb%2B8WdIh9EQpHQR2LQTAGlWQSi3wQTfa4m8SmDIu%2F8IvSsTRvlVS2MaWcwf2vSptxolywNNZFzgXUgr17kNsDloOddElVo8ayZNye2F8CQwW6uoJdxusHhUpAMuIDDFn2RCSuU4IFJj6gVAYwTNJQ0Jat2pbWkp0BjNQMdrcMt4NemnC3oAuPsVLRePPBCA0woDuqBJal441b%2Ff4lEN%2BPmAjZ4fcT4mv2RCSuWVMnlgFUy1ZNhSvGOy4bnYuomuEp4howXhCMoVaGpVZ6Ip00HieElyG1Epb88dZE%2FMuXNmNyBD8B0ohJKpoMqWXp%2BaIWv28B7PHiNnv7sNCJ4bKN%2B5dtq86aDG4Lg3uhPWMwYD2CyrAYIBOKMrksHr9aspubcatIppRGLVasvPR88S3gKgFLDXIBsWyTkZhNJo3z984xWbwMhWTUS3szHcwjKrB1T%2FOtonRrKFy3QEMs22aWjNO4QJ1CUOnSqb5zcSzTXS1CLFg%2FHBjetm0NrW32Mp7%2FLMGcPLmrh5qNawQUwjKMR%2Fmgcx5vB6ex%2FjgEpG3GeI8dQXdIc%2FMItdgol0%2FRmIPM0vPEt%2FgKv4hUoHG4ZuuabYKIE8waoSHxsW1buvDMXW5Gr48DEWh3RWBpx3OvdF6eDmnLW1xPN4z32JHft1iWWnUspnZevLBMd7UULaipEVyGVyEWFIt4HJJRjzBsq9g%2FGA3MVojGDvYclGvXwaBoqMNDQC2kllbEcnr8EbK%2FYiHtSnQZJEGxsR%2BmR67zxLf4Ky6RVAa2ShprtnmBWaP1olzOaFGa2Zw5qPu%2FgcpwHx06ATI0jEWpBd3LvHH6fImF60V4fRksh20s01wt%2FqU1NUIuNVcwpYymGC6cUXyOdDsbkYpcXbr9NFBFaqFEX3DJHmeEDJtgFpbeYNAwoWgZjrOfL0YMCknCJYNYVqxYg4%2B9Lr98zeX0Cb%2FiL621in3Ap1X4wnU5Y4NcxGSEXtXokMQJVxEjFySTP061%2BMoNFodgyJ5J07Z0InpsJh%2FLPN2nfcWKNb9Vz%2BXwrKEPeC4fbVlgkIvgIyBJLqSUrVv1DiFJZiV6%2FZCIxXAtHuePsU92iIj11SA8XfApSB%2FwGdHAp%2FNCLRC%2B%2FEiug78Va4X8WAMfl8sP10Js%2BmU%2Fq%2FSjfnX5yfXrN15%2B%2BQ4dDuFeYSCxIbKhZQMscctu68LxRa5%2BOCD9E1hdP%2FnJV0db54VafIUAZJie9URjxW891xoG4nJJSoPhiORrlSICz8nfgoDgo8eKVBMbejcEgExoA63GDTPH92MMWL74E1pf9eACOpGfzgu1VCxQYvnRb8e9VmlpnTT%2F8KT4gJeNBbgkNvA1Y3wbIYDl8z8Z%2Fole57NaIHpRVLb%2BdmLXSQsOLvxZ3QCfNnx1A1DZAGphYBo3bBgvlpKf%2FORH9HA0hOcnXzUSOh%2FU4l8ygWI500Io4oPw9CIXvorHde4EsPzoRz8xT7p1HhRfoA1RUdkF79sJ9ZqUtUWZkQ2IBj%2FZVDYsGVeEjGohHKMxYVjGpZb%2FD4SrdSPnjg%2FqAAAAAElFTkSuQmCC" />'
			var raptorAudioMarkup = '<audio id="elRaptorShriek" preload="auto"><source src="data:audio/mpeg;base64,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qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpMQU1FMy45NCAoYmV0YSmqqqqqqqqqqqqqqqqqqqqq//tgxP+AAAABpBgAAAAAADSDAAAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpMQU1FMy45NCAoYmV0YSmqqqqqqqqqqqqqqqqqqqqq//tgxP+AAAABpBgAAAAAADSDAAAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqTEFNRTMuOTQgKGJldGEpqqqqqqqqqqqqqqqqqqqq//tgxP+AAAABpBgAAAAAADSDAAAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tixP+AAAABpBgAAAAAADSDAAAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqg==" /><source src="data:video/ogg;base64,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" /></audio>';
			var locked = false;

			//Append Raptor and Style
			$('body').append(raptorImageMarkup);
 			if(audioSupported) { $('body').append(raptorAudioMarkup); }
			var raptor = $('#elRaptor').css({
				"position":"fixed",
				"bottom": "-700px",
				"right" : "0",
				"display" : "block"
			})

			// Animating Code
			function init() {
				locked = true;

				//Sound Hilarity
				if(audioSupported) {
					function playSound() {
						document.getElementById('elRaptorShriek').play();
					}
					playSound();
				}

				// Movement Hilarity
				raptor.animate({
					"bottom" : "0"
				}, function() {
					$(this).animate({
						"bottom" : "-30px"
					}, 100, function() {
						var offset = (($(this).position().left)+400);
						$(this).delay(300).animate({
							"right" : offset
						}, 2200, function() {
							raptor = $('#elRaptor').css({
								"bottom": "-700px",
								"right" : "0"
							})
							locked = false;
						})
					});
				});
			}


			//Determine Entrance
			if(options.enterOn == 'timer') {
				setTimeout(init, options.delayTime);
			} else if(options.enterOn == 'click') {
				_this.bind('click', function(e) {
					e.preventDefault();
					if(!locked) {
						init();
					}
				})
			} else if(options.enterOn == 'konami-code'){
			    var kkeys = [], konami = "38,38,40,40,37,39,37,39,66,65";
			    $(window).bind("keydown.raptorz", function(e){
			        kkeys.push( e.keyCode );
			        if ( kkeys.toString().indexOf( konami ) >= 0 ) {
			        	init();
			        	$(window).unbind('keydown.raptorz');
			        }
			    }, true);

			}

        });//each call
    }//orbit plugin call
})(jQuery);

(function($, window, rangy, undefined) {/**
 * @name $
 * @namespace jQuery
 */

/**
 * jQuery UI Editor
 *
 * <p>
 * Events:
 * <dl>
 *   <dt>resize</dt>
 *     <dd>Triggers when the page, or an element is resized to allow plugins to adjust their position</dt>
 *   <dt>change</dt>
 *     <dd>Triggers when ever the element content is change, or the selection is changed</dt>
 *   <dt>ready</dt>
 *     <dd>Triggers after the editor has been initialised, (but possibly before the editor is shown and enabled)</dt>
 *   <dt>show</dt>
 *     <dd>Triggers when the toolbar/dialog is shown</dt>
 *   <dt>hide</dt>
 *     <dd>Triggers when the toolbar/dialog is hidden</dt>
 *   <dt>enabled</dt>
 *     <dd>Triggers when the editing is enabled on the element</dt>
 *   <dt>disabled</dt>
 *     <dd>Triggers when the editing is disabled on the element</dt>
 * </dl>
 * </p>
 *
 * Naming Conventions:
 * In function names and parameters the following keywords mean:
 *  - node: A DOM node
 *  - tag: The tag name, e.g. h1, h2, p, a, etc
 *  - element: A jQuery element, selector, not HTML string (use $.parseHTML instead)
 *
 * @name $.editor
 * @class
 */

/**
 * @name $.ui
 * @namespace  jQuery UI
 */

/**
 * jQuery UI Editor
 * @name $.ui.editor
 * @namespace jQuery UI Editor
 */

/**
 * Default settings for the jQuery UI Editor widget
 * @name $.editor#options
 * @property {boolean} options
 */

/**
 * @name $.editor#reiniting
 * @property {boolean} reiniting
 */

/**
 * @name $.editor#ready
 * @property {boolean} ready
 */

/**
 * @name $.editor#element
 * @property {jQuery} element
 */

/**
 * @name $.editor#toolbar
 * @property {jQuery} toolbar
 */

/**
 * @name $.editor#events
 * @property {Object} events
 */

/**
 * @name $.editor#ui
 * @property {Object} ui
 */

/**
 * @name $.editor#plugins
 * @property {Object} plugins
 */

/**
 * @name $.editor#templates
 * @property {Object} templates
 */

/**
 * @name $.editor#history
 * @property {String[]} history
 */

/**
 * @name $.editor#present
 * @property {int} present
 */

/**
 * Switch to temporarly disable history function. Used when the history is being
 * traversed.
 *
 * @name $.editor#historyEnabled
 * @property {boolean} historyEnabled
 */

/**
 * @name $.editor#originalHtml
 * @property {String} originalHtml
 */

/**
 * @name $.editor.ui
 * @namespace Namespace beneath which all ui components reside
 */

/**
 * @name $.editor.plugin
 * @namespace Namespace beneath which all plugins reside
 *//**
 * @fileOverview This file has contains functions for making adjustments to the
 *      DOM based on ranges, selections, etc.
 * @author David Neilsen - david@panmedia.co.nz
 * @author Michael Robinson - michael@panmedia.co.nz
 * @version 0.2
 */

/**
 * Functions attached to the editor object during editor initialisation. Usage example:
 * <pre>editor.saveSelection();
// Perform actions that could remove focus from editing element
editor.restoreSelection();
editor.replaceSelection('&lt;p&gt;Replace selection with this&lt;/p&gt;');</pre>
 * @namespace
 */
var domTools = {

    /**
     * @type {Boolean|Object} current saved selection.
     */
    savedSelection: false,

    /**
     * Save selection wrapper, preventing plugins / UI from accessing rangy directly.
     */
    saveSelection: function() {
        this.savedSelection = rangy.saveSelection();
    },

    /**
     * Restore selection wrapper, preventing plugins / UI from accessing rangy directly.
     */
    restoreSelection: function() {
        if (this.savedSelection) {
            rangy.restoreSelection(this.savedSelection);
            this.savedSelection = false;
        }
    },

    /**
     * Removes all ranges from a selection that are not contained within the
     * supplied element.
     *
     * @public @static
     * @param {jQuerySelector|jQuery|Element} element
     * @param {RangySelection} [selection]
     */
    constrainSelection: function(element, selection) {
        element = $(element)[0];
        selection = selection || rangy.getSelection();

        var commonAncestor;
        $(selection.getAllRanges()).each(function(i, range){
            if (this.commonAncestorContainer.nodeType === 3) {
                commonAncestor = $(range.commonAncestorContainer).parent()[0];
            } else {
                commonAncestor = range.commonAncestorContainer;
            }
            if (element !== commonAncestor && !$.contains(element, commonAncestor)) {
                selection.removeRange(range);
            }
        });
    },

    /**
     * Gets all elements that contain a selection (excluding text nodes) and
     * returns them as a jQuery array.
     *
     * @public @static
     * @param {RangySelection} [sel] A RangySelection, or by default, the current selection.
     */
    getSelectedElements: function(sel) {
        var result = new jQuery();
        selectionEachRange(function(range) {
            result.push(this.getSelectedElement(range)[0]);
        }, sel, this);
        return result;
    },

    getSelectedElement: function (range) {
        var commonAncestor;

        range = range || rangy.getSelection().getRangeAt(0);

        // Check if the common ancestor container is a text node
        if (range.commonAncestorContainer.nodeType === 3) {
            // Use the parent instead
            commonAncestor = range.commonAncestorContainer.parentNode;
        } else {
            commonAncestor = range.commonAncestorContainer;
        }
        return $(commonAncestor);
    },

    /**
     * @param  {RangySelection|null} selection Selection to get html from or null to use current selection.
     * @return {string} The html content of the selection.
     */
    getSelectedHtml: function(selection) {
        selection = selection || rangy.getSelection();
        return selection.toHtml();
    },

    getSelectionStartElement: function() {
        var selection = rangy.getSelection();
        if (selection.isBackwards()) {
            return selection.focusNode.nodeType === 3 ? $(selection.focusNode.parentElement) : $(selection.focusNode);
        }
        return selection.anchorNode.nodeType === 3 ? $(selection.anchorNode.parentElement) : $(selection.anchorNode);
    },

    getSelectionEndElement: function() {
        var selection = rangy.getSelection();
        if (selection.isBackwards()) {
            return selection.anchorNode.nodeType === 3 ? $(selection.anchorNode.parentElement) : $(selection.anchorNode);
        }
        return selection.focusNode.nodeType === 3 ? $(selection.focusNode.parentElement) : $(selection.focusNode);
    },

    unwrapParentTag: function(tag) {
        this.getSelectedElements().each(function(){
            if ($(this).is(tag)) {
                $(this).replaceWith($(this).html());
            }
        });
    },

    wrapTagWithAttribute: function(tag, attributes, classes) {
        selectionEachRange(function(range) {
            var element = this.getSelectedElement(range);
            if (element.is(tag)) {
                element.attr(attributes);
            } else {
                this.toggleWrapper(tag, {
                    classes: classes,
                    attributes: attributes
                });
            }
        }, null, this);
    },

    /**
     * Selects all the contents of the supplied element, excluding the element itself.
     *
     * @public @static
     * @param {jQuerySelector|jQuery|Element} element
     * @param {RangySelection} [selection] A RangySelection, or by default, the current selection.
     */
    selectInner: function(element, selection) {
        selection = selection || rangy.getSelection();
        selection.removeAllRanges();
        $(element).focus().contents().each(function() {
            var range = rangy.createRange();
            range.selectNodeContents(this);
            selection.addRange(range);
        });
    },

    /**
     * Selects all the contents of the supplied element, including the element itself.
     *
     * @public @static
     * @param {jQuerySelector|jQuery|Element} element
     * @param {RangySelection} [selection] A RangySelection, or null to use the current selection.
     */
    selectOuter: function(element, selection) {
        selection = selection || rangy.getSelection();
        selection.removeAllRanges();
        $(element).each(function() {
            var range = rangy.createRange();
            range.selectNode(this);
            selection.addRange(range);
        }).focus();
    },

    /**
     * Move selection to the end of element.
     *
     * @param  {jQuerySelector|jQuery|Element} element The subject element.
     * @param  {RangySelection|null} selection A RangySelection, or null to use the current selection.
     */
    selectEnd: function(element, selection) {
        selection = selection || rangy.getSelection();
        selection.removeAllRanges();

        $(element).each(function() {
            var range = rangy.createRange();
            range.selectNodeContents(this);
            range.collapse();
            selection.addRange(range);
        });
    },

    /**
     * FIXME: this function needs reviewing
     *
     * This should toggle an inline style, and normalise any overlapping tags, or adjacent (ignoring white space) tags.
     *
     * @public @static
     */
    toggleWrapper: function(tag, options) {
        options = options || {};
        var applier = rangy.createCssClassApplier(options.classes || '', {
            normalize: true,
            elementTagName: tag,
            elementProperties: options.attributes || {}
        });
        selectionEachRange(function(range) {
            if (this.rangeEmptyTag(range)) {
                var element = $('<' + tag + '/>')
                    .addClass(options.classes)
                    .attr(options.attributes || {})
                    .append(fragmentToHtml(range.cloneContents()));
                this.replaceRange(element, range);
            } else {
                applier.toggleRange(range);
            }
        }, null, this);
    },

    rangeEmptyTag: function(range) {
        var contents = range.cloneContents();
        var html = fragmentToHtml(contents);
        if (typeof html === 'string') {
            html = html.replace(/([ #;&,.+*~\':"!^$[\]()=>|\/@])/g,'\\$1');
        }
        if ($(html).is(':empty')) return true;
        return false;
    },

    /**
     * Wrapper function for document.execCommand().
     * @public @static
     */
    execCommand: function(command, arg1, arg2) {
        try {
            document.execCommand(command, arg1, arg2);
        } catch (exception) { }
    },

    /**
     * Creates a new elements and inserts it at the start of each range in a selection.
     *
     * @public @static
     * @param {String} tagName
     * @param {RangySelection} [sel] A RangySelection, or by default, the current selection.
     */
    insertTag: function(tagName, sel) {
        selectionEachRange(function(range) {
            range.insertNode($('<' + tagName + '/>')[0]);
        }, sel, this);
    },

    /**
     * Creates a new elements and inserts it at the end of each range in a selection.
     *
     * @public @static
     * @param {String} tagName
     * @param {RangySelection} [sel] A RangySelection, or by default, the current selection.
     */
    insertTagAtEnd: function(tagName, sel) {
        selectionEachRange(function(range) {
            range.insertNodeAtEnd($('<' + tagName + '/>')[0]);
        }, sel, this);
    },

    /**
     * Inserts a element at the start of each range in a selection. If the clone
     * parameter is true (default) then the each node in the element will be cloned
     * (copied). If false, then each node will be moved.
     *
     * @public @static
     * @param {jQuerySelector|jQuery|Element} element The jQuery element to insert
     * @param {boolean} [clone] Switch to indicate if the nodes chould be cloned
     * @param {RangySelection} [sel] A RangySelection, or by default, the current selection.
     */
    insertElement: function(element, clone, sel) {
        selectionEachRange(function(range) {
            $(element).each(function() {
                range.insertNode(clone === false ? this : this.cloneNode(true));
            });
        }, sel, this);
    },

    /**
     * Inserts a element at the end of each range in a selection. If the clone
     * paramter is true (default) then the each node in the element will be cloned
     * (copied). If false, then each node will be moved.
     *
     * @public @static
     * @param {jQuerySelector|jQuery|Element} element The jQuery element to insert
     * @param {boolean} [clone] Switch to indicate if the nodes chould be cloned
     * @param {RangySelection} [selection] A RangySelection, or by default, the current selection.
     */
    insertElementAtEnd: function(element, clone, sel) {
        selectionEachRange(function(range) {
            $(element).each(function() {
                range.insertNodeAtEnd(clone === false ? this : this.cloneNode(true));
            });
        }, sel, this);
    },

    /**
     * Toggles style(s) on the first block level parent element of each range in a selection
     *
     * @public @static
     * @param {Object} styles styles to apply
     * @param {jQuerySelector|jQuery|Element} limit The parent limit element.
     * If there is no block level elements before the limit, then the limit content
     * element will be wrapped with a "div"
     */
    toggleBlockStyle: function(styles, limit) {
        selectionEachRange(function(range) {
            var parent = $(range.commonAncestorContainer);
            while (parent.length && parent[0] !== limit[0] && (
                    parent[0].nodeType === 3 || parent.css('display') === 'inline')) {
                parent = parent.parent();
            }
            if (parent[0] === limit[0]) {
                // Only apply block style if the limit element is a block
                if (limit.css('display') !== 'inline') {
                    // Wrap the HTML inside the limit element
                    this.wrapInner(limit, 'div');
                    // Set the parent to the wrapper
                    parent = limit.children().first();
                }
            }
            // Apply the style to the parent
            this.toggleStyle(parent, styles);
        }, null, this);
    },

    /**
     * Wraps the inner content of an element with a tag
     *
     * @public @static
     * @param {jQuerySelector|jQuery|Element} element The element(s) to wrap
     * @param {String} tag The wrapper tag name
     */
    wrapInner: function(element, tag) {
        this.saveSelection();
        $(element).each(function() {
            var wrapper = $('<' + tag + '/>').html($(this).html());
            element.html(wrapper);
        });
        this.restoreSelection();
    },

    /**
     *
     */
    inverseWrapWithTagClass: function(tag1, class1, tag2, class2) {
        this.saveSelection();
        // Assign a temporary tag name (to fool rangy)
        var id = 'domTools' + Math.ceil(Math.random() * 10000000);

        selectionEachRange(function(range) {
            var applier2 = rangy.createCssClassApplier(class2, {
                elementTagName: tag2
            });

            // Check if tag 2 is applied to range
            if (applier2.isAppliedToRange(range)) {
                // Remove tag 2 to range
                applier2.toggleSelection();
            } else {
                // Apply tag 1 to range
                rangy.createCssClassApplier(class1, {
                    elementTagName: id
                }).toggleSelection();
            }
        }, null, this);

        // Replace the temparay tag with the correct tag
        $(id).each(function() {
            $(this).replaceWith($('<' + tag1 + '/>').addClass(class1).html($(this).html()));
        });

        this.restoreSelection();
    },

    /**
     * FIXME: this function needs reviewing
     * @public @static
     * @param {jQuerySelector|jQuery|Element} element The jQuery element to insert
     */
    toggleStyle: function(element, styles) {
        $.each(styles, function(property, value) {
            if ($(element).css(property) === value) {
                $(element).css(property, '');
            } else {
                $(element).css(property, value);
            }
        });
    },

    /**
     * FIXME: this function needs reviewing
     * @param {jQuerySelector|jQuery|Element} element
     */
    getStyles: function(element) {
        var result = {};
        var style = window.getComputedStyle(element[0], null);
        for (var i = 0; i < style.length; i++) {
            result[style.item(i)] = style.getPropertyValue(style.item(i));
        }
        return result;
    },

    /**
     * @public @static
     * @param {jQuerySelector|jQuery|Element} element1
     * @param {jQuerySelector|jQuery|Element} element2
     * @param {Object} style
     */
    swapStyles: function(element1, element2, style) {
        for (var name in style) {
            element1.css(name, element2.css(name));
            element2.css(name, style[name]);
        }
    },

    /**
     * Replace current selection with given html, ensuring that selection container is split at
     * the start & end of the selection in cases where the selection starts / ends within an invalid element.
     * @param  {jQuery|Element|string} html The html to replace current selection with.
     * @param  {Array} validTagNames An array of tag names for tags that the given html may be inserted into without having the selection container split.
     * @param  {RangySeleciton|null} selection The selection to replace, or null for the current selection.
     */
    replaceSelectionWithinValidTags: function(html, validTagNames, selection) {
        selection = selection || rangy.getSelection();

        var startElement = this.getSelectionStartElement()[0];
        var endElement = this.getSelectionEndElement()[0];
        var selectedElement = this.getSelectedElements()[0];

        var selectedElementValid = this.isElementValid(selectedElement, validTagNames);
        var startElementValid = this.isElementValid(startElement, validTagNames);
        var endElementValid = this.isElementValid(endElement, validTagNames);

        // The html may be inserted within the selected element & selection start / end.
        if (selectedElementValid && startElementValid && endElementValid) {
            this.replaceSelection(html);
            return;
        }

        // Context is invalid. Split containing element and insert list in between.
        this.replaceSelectionSplittingSelectedElement(html, selection);
        return;
    },

    /**
     * Split the selection container and insert the given html between the two elements created.
     * @param  {jQuery|Element|string} html The html to replace selection with.
     * @param  {RangySelection|null} selection The selection to replace, or null for the current selection.
     */
    replaceSelectionSplittingSelectedElement: function(html, selection) {
        selection = selection || rangy.getSelection();

        var selectionRange = selection.getRangeAt(0);
        var selectedElement = this.getSelectedElements()[0];

        // Select from start of selected element to start of selection
        var startRange = rangy.createRange();
        startRange.setStartBefore(selectedElement);
        startRange.setEnd(selectionRange.startContainer, selectionRange.startOffset);
        var startFragment = startRange.cloneContents();

        // Select from end of selected element to end of selection
        var endRange = rangy.createRange();
        endRange.setStart(selectionRange.endContainer, selectionRange.endOffset);
        endRange.setEndAfter(selectedElement);
        var endFragment = endRange.cloneContents();

        // Replace the start element's html with the content that was not selected, append html & end element's html
        var replacement = elementOuterHtml($(fragmentToHtml(startFragment)));
        replacement += elementOuterHtml($(html));
        replacement += elementOuterHtml($(fragmentToHtml(endFragment)));

        $(selectedElement).replaceWith($(replacement));
    },

    /**
     * FIXME: this function needs reviewing
     * @public @static
     */
    replaceSelection: function(html, sel) {
        selectionEachRange(function(range) {
            this.replaceRange(html, range);
        }, sel, this);
    },

    replaceRange: function(html, range) {
        var nodes = $('<div/>').append(html)[0].childNodes;
        range.deleteContents();
        if (nodes.length === undefined || nodes.length === 1) {
            range.insertNode(nodes[0].cloneNode(true));
        } else {
            $.each(nodes, function(i, node) {
                range.insertNodeAtEnd(node.cloneNode(true));
            });
        }
    },

    /**
     *
     *
     * @public @static
     * @param {DOMFragment} domFragment
     * @param {jQuerySelector|jQuery|Element} beforeElement
     * @param {String} wrapperTag
     */
    insertDomFragmentBefore: function(domFragment, beforeElement, wrapperTag) {
        // Get all nodes in the extracted content
        for (var j = 0, l = domFragment.childNodes.length; j < l; j++) {
            var node = domFragment.childNodes.item(j);
            // Prepend the node before the current node
            var content = node.nodeType === 3 ? node.nodeValue : $(node).html();
            if (content) {
                $('<' + wrapperTag + '/>')
                    .html($.trim(content))
                    .insertBefore(beforeElement);
            }
        }
    },

    /**
     * Returns true if there is at least one range selected and the range is not
     * empty.
     *
     * @see isEmpty
     * @public @static
     * @param {RangySelection} [selection] A RangySelection, or by default, the current selection.
     */
    selectionExists: function(sel) {
        var selectionExists = false;
        selectionEachRange(function(range) {
            if (!this.isEmpty(range)) selectionExists = true;
        }, sel, this);
        return selectionExists;
    },

    /**
     * Returns true if the supplied range is empty (has a length of 0)
     *
     * @public @static
     * @param {RangyRange} range The range to check if it is empty
     */
    isEmpty: function(range) {
        return range.startOffset === range.endOffset &&
               range.startContainer === range.endContainer;
    },

    /**
     * Check that the given element is one of the the given tags
     * @param  {jQuery|Element} element The element to be tested.
     * @param  {Array}  validTagNames An array of valid tag names.
     * @return {Boolean} True if the given element is one of the give valid tags.
     */
    isElementValid: function(element, validTags) {
        return -1 !== $.inArray($(element)[0].tagName.toLowerCase(), validTags);
    },

    /**
     * Modification of strip_tags from PHP JS - http://phpjs.org/functions/strip_tags:535.
     * @param  {string} content HTML containing tags to be stripped
     * @param {Array} allowedTags Array of tags that should not be stripped
     * @return {string} HTML with all tags not present allowedTags array.
     */
    stripTags: function(content, allowedTags) {
        // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
        allowed = [];
        for (var allowedTagsIndex = 0; allowedTagsIndex < allowedTags.length; allowedTagsIndex++) {
            if (allowedTags[allowedTagsIndex].match(/[a-z][a-z0-9]{0,}/g)) {
                allowed.push(allowedTags[allowedTagsIndex]);
            }
        }
        // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
        var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*\/?>/gi,
            commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;

        return content.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
            return allowed.indexOf($1.toLowerCase()) > -1 ? $0 : '';
        });
    }
};/**
 * Editor internationalization (i18n) private functions and properties.
 *
 * @author David Neilsen <david@panmedia.co.nz>
 * @author Michael Robinson <michael@panmedia.co.nz>
 */

/**
 * @type String|null
 */
var currentLocale = null;

/**
 * @type Object
 */
var locales = {};

/**
 * @type Object
 */
var localeNames = {};

/**
 *
 * @static
 * @param {String} name
 * @param {String} nativeName
 * @param {Object} strings
 */
function registerLocale(name, nativeName, strings) {
    // <strict/>

    locales[name] = strings;
    localeNames[name] = nativeName;
    if (!currentLocale) currentLocale = name;
}

/**
 * @param {String} key
 */
function setLocale(key) {
    if (currentLocale !== key) {
        // <debug/>

        currentLocale = key;
        $.ui.editor.eachInstance(function() {
            this.reinit();
        });
    }
}

/**
 * Internationalisation function. Translates a string with tagged variable
 * references to the current locale.
 *
 * <p>
 * Variable references should be surrounded with double curly braces {{ }}
 *      e.g. "This string has a variable: {{my.variable}} which will not be translated"
 * </p>
 *
 * @static
 * @param {String} string
 * @param {Object} variables
 */
function _(string, variables) {
    // Get the current locale translated string
    if (currentLocale &&
            locales[currentLocale] &&
            locales[currentLocale][string]) {
        string = locales[currentLocale][string];
    }

    // Convert the variables
    if (!variables) {
        return string;
    } else {
        for (var key in variables) {
            string = string.replace('{{' + key + '}}', variables[key]);
        }
        return string;
    }
}
// <debug/>


// <strict/>


$(function() {
    // Initialise rangy
    if (!rangy.initialized) {
        rangy.init();
    }

    // Add helper method to rangy
    if (!$.isFunction(rangy.rangePrototype.insertNodeAtEnd)) {
        rangy.rangePrototype.insertNodeAtEnd = function(node) {
            var range = this.cloneRange();
            range.collapse(false);
            range.insertNode(node);
            range.detach();
            this.setEndAfter(node);
        };
    }
});

// Select menu close event (triggered when clicked off)
$('html').click(function(event) {
    $('.ui-editor-selectmenu-visible')
        .removeClass('ui-editor-selectmenu-visible');
});
/**
 *
 * @author David Neilsen - david@panmedia.co.nz
 * @author Michael Robinson - michael@panmedia.co.nz
 * @version 0.1
 * @requires jQuery
 * @requires jQuery UI
 * @requires Rangy
 */

$.widget('ui.editor',
    /**
     * @lends $.editor.prototype
     */
    {

    /**
     * Constructor
     */
    _init: function() {
        // Add the editor instance to the global list of instances
        if ($.inArray(this, $.ui.editor.instances) === -1) {
            $.ui.editor.instances.push(this);
        }

        // Check for nested editors
        var currentInstance = this;
        $.ui.editor.eachInstance(function(instance) {
            if (currentInstance != instance &&
                    currentInstance.element.closest(instance.element).length) {
                handleError('Nesting editors is unsupported', currentInstance.element, instance.element);
            }
        });

        this.options = $.extend({}, $.ui.editor.defaults, this.options);

        // Give the element a unique ID
        if (!this.element.attr('id')) {
            this.element.attr('id', this.getUniqueId());
        }

        // Initialise properties
        this.ready = false;
        this.events = {};
        this.ui = {};
        this.plugins = {};
        this.templates = $.extend({}, $.ui.editor.templates);
        this.layout = null;

        // True if editing is enabled
        this.enabled = false;

        // True if the layout has been loaded and displayed
        this.visible = false;

        // List of UI objects bound to the editor
        this.uiObjects = {};

        // Bind default events
        for (var name in this.options.bind) {
            this.bind(name, this.options.bind[name]);
        }

        // Undo stack, redo pointer
        this.history = [];
        this.present = 0;
        this.historyEnabled = true;

        // Check for browser support
        if (!isSupported(this)) {
            return;
        }

        // Clone the DOM tools functions
        this.cloneDomTools();

        // Store the original HTML
        this.setOriginalHtml(this.element.is(':input') ? this.element.val() : this.element.html());

        // Replace the original element with a div (if specified)
        if (this.options.replace) {
            this.replaceOriginal();
            this.options.replace = false;
        }

        // Attach core events
        this.attach();

        // Load plugins
        this.loadPlugins();

        // Stores if the current state of the content is clean
        this.dirty = false;

        // Stores the previous state of the content
        this.previousContent = null;

        // Stores the previous selection
        this.previousSelection = null;

        // Fire the ready event
        this.ready = true;
        this.fire('ready');

        // Automaticly enable the editor if autoEnable is true
        if (this.options.autoEnable) {
            $(function() {
                currentInstance.enableEditing();
                currentInstance.showLayout();
            });
        }
    },

    /*========================================================================*\
     * Core functions
    \*========================================================================*/

    /**
     * Attaches the editors internal events.
     */
    attach: function() {
        this.bind('change', this.historyPush);
        this.bind('selectionChange', this.updateTagTree);
        this.bind('show', this.updateTagTree);

        var change = $.proxy(this.checkChange, this);

        this.getElement().find('img').bind('click.' + this.widgetName, $.proxy(function(event){
            this.selectOuter(event.target);
        }, this));
        // this.bind('change', change);
        this.getElement().bind('mouseup.' + this.widgetName, change);
        this.getElement().bind('keyup.' + this.widgetName, change);

        // Unload warning
        $(window).bind('beforeunload', $.proxy($.ui.editor.unloadWarning, $.ui.editor));
    },

    /**
     * Reinitialises the editor, unbinding all events, destroys all UI and plugins
     * then recreates them.
     */
    reinit: function() {
        if (!this.ready) {
            // If the edit is still initialising, wait until its ready
            var reinit;
            reinit = function() {
                // Prevent reinit getting called twice
                this.unbind('ready', reinit);
                this.reinit();
            };
            this.bind('ready', reinit);
            return;
        }
        // <debug/>

        // Store the state of the editor
        var enabled = this.enabled,
            visible = this.visible;

        // We are ready, so we can run reinit now
        this.destruct();
        this._init();

        // Restore the editor state
        if (enabled) {
            this.enableEditing();
        }

        if (visible) {
            this.showLayout();
        }
    },

    /**
     * Returns the current content editable element, which will be either the
     * orignal element, or the div the orignal element was replaced with.
     * @returns {jQuery} The current content editable element
     */
    getElement: function() {
        return this.target ? this.target : this.element;
    },

    /**
     *
     */
    getOriginalElement: function() {
        return this.element;
    },

    /**
     * Replaces the original element with a content editable div. Typically used
     * to replace a textarea.
     */
    replaceOriginal: function() {
        if (this.target) return;

        // Create the replacement div
        var target = $('<div/>')
            // Set the HTML of the div to the HTML of the original element, or if the original element was an input, use its value instead
            .html(this.element.is(':input') ? this.element.val() : this.element.html())
            // Insert the div before the origianl element
            .insertBefore(this.element)
            // Give the div a unique ID
            .attr('id', this.getUniqueId())
            // Copy the original elements class(es) to the replacement div
            .addClass(this.element.attr('class'));

        var style = this.options.domTools.getStyles(this.element);
        for (var i = 0; i < this.options.replaceStyle.length; i++) {
            target.css(this.options.replaceStyle[i], style[this.options.replaceStyle[i]]);
        }

        this.element.hide();
        this.bind('change', function() {
            if (this.element.is('input')) {
                this.element.val(this.getHtml());
            } else {
                this.element.html(this.getHtml());
            }
        });
        this.target = target;
    },

    /**
     * Clones all of the DOM tools functions, and constrains the selection before
     * calling.
     */
    cloneDomTools: function() {
        for (var i in this.options.domTools) {
            if (!this[i]) {
                this[i] = (function(i) {
                    return function() {
                        this.options.domTools.constrainSelection(this.getElement());
                        var html = this.getHtml();
                        var result = this.options.domTools[i].apply(this.options.domTools, arguments);
                        if (html !== this.getHtml()) {
                            // <debug/>
                            this.change();
                        }
                        return result;
                    };
                })(i);
            }
        }
    },

    /**
     * Determine whether the editing element's content has been changed.
     */
    checkChange: function() {
        // Check if the caret has changed position
        var currentSelection = rangy.serializeSelection();
        if (this.previousSelection !== currentSelection) {
            this.fire('selectionChange');
        }
        this.previousSelection = currentSelection;

        // Get the current content
        var currentHtml = this.getCleanHtml();

        // Check if the dirty state has changed
        var wasDirty = this.dirty;

        // Check if the current content is different from the original content
        this.dirty = this.getOriginalHtml() !== currentHtml;

        // If the current content has changed since the last check, fire the change event
        if (this.previousHtml !== currentHtml) {
            this.previousHtml = currentHtml;
            this.change();

            // If the content was changed to its original state, fire the cleaned event
            if (wasDirty !== this.dirty) {
                if (this.dirty) {
                    this.fire('dirty');
                } else {
                    this.fire('cleaned');
                }
            }
        }
    },

    change: function() {
        this.fire('change');
    },

    /*========================================================================*\
     * Destructor
    \*========================================================================*/

    /**
     * Hides the layout, disables editing, and fires the destroy event, and unbinds any events.
     * @public
     */
    destruct: function() {
        // Disable editing unless we are re initialising
        this.hideLayout();
        this.disableEditing();

        // Trigger destroy event, for plugins to remove them selves
        this.fire('destroy', false);

        // Remove all event bindings
        this.events = {};

        // Unbind all events
        this.getElement().unbind('.' + this.widgetName);

        // Remove the layout
        if (this.layout) {
            this.layout.destruct();
        }
    },

    /**
     * Runs destruct, then calls the UI widget destroy function.
     * @see $.
     */
    destroy: function() {
        this.destruct();
        $.Widget.prototype.destroy.call(this);
    },

    /*========================================================================*\
     * Persistance Functions
    \*========================================================================*/

    /**
     * @param {String} key
     * @param {mixed} [value]
     * @returns {mixed}
     */
    persist: function(key, value) {
        if (!this.options.persistence) return null;
        return $.ui.editor.persist(key, value, this.options.namespace);
    },

    /*========================================================================*\
     * Other Functions
    \*========================================================================*/

    /**
     *
     */
    enableEditing: function() {
        this.loadLayout();

        if (!this.enabled) {
            this.enabled = true;
            this.getElement().addClass(this.options.baseClass + '-editing');

            if (this.options.partialEdit) {
                this.getElement().find(this.options.partialEdit).attr('contenteditable', true);
            } else {
                this.getElement().attr('contenteditable', true);
            }

            this.execCommand('enableInlineTableEditing', false, false);
            this.execCommand('styleWithCSS', true, true);

            this.fire('enabled');
            this.fire('resize');
        }
    },

    /**
     *
     */
    disableEditing: function() {
        if (this.enabled) {
            this.enabled = false;
            this.getElement().attr('contenteditable', false)
                        .removeClass(this.options.baseClass + '-editing');
            rangy.getSelection().removeAllRanges();
            this.fire('disabled');
        }
    },

    /**
     *
     * @returns {boolean}
     */
    isEditing: function() {
        return this.enabled;
    },

    /**
     *
     */
    updateTagTree: function() {
//        if (!this.isEditing()) return;
//
//        var editor = this;
//        var title = '';
//
//        // An array of ranges (by index), each with a list of elements in the range
//        var lists = [];
//        var i = 0;
//
//        // Loop all selected ranges
//        selectionEachRange(function(range) {
//            // Get the selected nodes common parent
//            var node = range.commonAncestorContainer;
//
//            var element;
//            if (node.nodeType === 3) {
//                // If nodes common parent is a text node, then use its parent
//                element = $(node).parent();
//            // } else if(this.rangeEmptyTag(range)) {
//            //     element = $(this.domFragmentToHtml(range.cloneContents()));
//            } else {
//                // Or else use the node
//                element = $(node);
//            }
//
//            var list = [];
//            lists.push(list);
//            // Loop untill we get to the root element, or the body tag
//            while (element[0] && !editor.isRoot(element) && element[0].tagName.toLowerCase() !== 'body') {
//                // Add the node to the list
//                list.push(element);
//                element = element.parent();
//            }
//            list.reverse();
//            if (title) title += ' | ';
//            title += this.getTemplate('root');
//            for (var j = 0; j < list.length; j++) {
//                title += this.getTemplate('tag', {
//                    element: list[j][0].tagName.toLowerCase(),
//                    // Create a data attribute with the index to the range, and element (so [0,0] will be the first range/first element)
//                    data: '[' + i + ',' + j + ']'
//                });
//            }
//            i++;
//        }, null, this);
//
//        if (!title) title = this.getTemplate('root');
//        this.path
//            .html(title)
//            .find('a')
//            .click(function() {
//                // Get the range/element data attribute
//                var i = $(this).data('ui-editor-selection');
//                if (i) {
//                    // Get the element from the list array
//                    editor.selectOuter(lists[i[0]][i[1]]);
//                    editor.updateTagTree();
//                } else {
//                    editor.selectOuter(editor.getElement());
//                }
//            });
//
//        this.fire('tagTreeUpdated');
    },

    /**
     * @param {jQuerySelector|jQuery|Element} element
     * @returns {boolean}
     */
    isRoot: function(element) {
        return this.getElement()[0] === $(element)[0];
    },

    /**
     * @param {function} callback
     * @param {boolean} [callSelf]
     */
    unify: function(callback, callSelf) {
        if (callSelf !== false) callback(this);
        if (this.options.unify) {
            var instances = $.ui.editor.getInstances();
            for (var i = 0; i < instances.length; i++) {
                if (instances[i] !== this &&
                        instances[i].options.unify) {
                    callback(instances[i]);
                }
            }
        }
    },

    /**
     * @returns {String}
     */
    getUniqueId: function() {
        return $.ui.editor.getUniqueId();
    },

    /*========================================================================*\
     * Messages
    \*========================================================================*/

    /**
     *
     */
    loadMessages: function() {
        this.messages = $(this.getTemplate('messages')).appendTo(this.wrapper);
    },

    /**
     * @param {String} type
     * @param {String[]} messages
     */
    showMessage: function(type, message, options) {
        options = $.extend({}, this.options.message, options);

        var messageObject;
        messageObject = {
            timer: null,
            editor: this,
            show: function() {
                this.element.slideDown();
                this.timer = window.setTimeout(function() {
                    this.timer = null;
                    messageObject.hide();
                }, options.delay, this);
            },
            hide: function() {
                if (this.timer) {
                    window.clearTimeout(this.timer);
                    this.timer = null;
                }
                this.element.stop().slideUp($.proxy(function() {
                    if ($.isFunction(options.hide)) {
                        options.hide.call(this);
                    }
                    this.element.remove();
                }, this));
            }
        };

        messageObject.element =
            $(this.getTemplate('message', {
                type: type,
                message: message
            }))
            .hide()
            .appendTo(this.messages)
            .find('.ui-editor-message-close')
                .click(function() {
                    messageObject.hide();
                })
            .end();

        messageObject.show();

        return messageObject;
    },

    /**
     * @param {String[]} messages
     */
    showLoading: function(message, options) {
        return this.showMessage('clock', message, options);
    },

    /**
     * @param {String[]} messages
     */
    showInfo: function(message, options) {
        return this.showMessage('info', message, options);
    },

    /**
     * @param {String[]} messages
     */
    showError: function(message, options) {
        return this.showMessage('circle-close', message, options);
    },

    /**
     * @param {String[]} messages
     */
    showConfirm: function(message, options) {
        return this.showMessage('circle-check', message, options);
    },

    /**
     * @param {String[]} messages
     */
    showWarning: function(message, options) {
        return this.showMessage('alert', message, options);
    },

    /*========================================================================*\
     * Layout
    \*========================================================================*/
    loadLayout: function() {
        if (!this.layout) {
            this.layout = $.extend({}, raptor.layouts[this.options.layout.type]);
            this.layout.editor = this;
            this.layout.options = $.extend(true, {}, this.options, this.layout.options, this.options.layout.options);
            this.layout.init(this, this.layout.options);
        }
    },

    /**
     * Show the layout for the current element.
     * @param  {Range} [range] a native range to select after the layout has been shown
     */
    showLayout: function(range) {
        this.loadLayout();

        if (!this.visible) {
            // <debug/>

            // If unify option is set, hide all other layouts first
            if (this.options.unify) {
                this.hideOtherLayouts(true);
            }

            // Store the visible state
            this.visible = true;

            this.layout.show();

            this.fire('resize');
            if (typeof this.getElement().attr('tabindex') === 'undefined') {
                this.getElement().attr('tabindex', -1);
            }

            if (range) {
                if (range.select) { // IE
                    range.select();
                } else { // Others
                    var selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }

            var editor = this;
            $(function() {
                editor.fire('show');
                editor.getElement().focus();
            });
        }
    },

    /**
     *
     */
    hideLayout: function() {
        if (this.layout) {
            this.visible = false;
            this.layout.hide();
            this.fire('hide');
            this.fire('resize');
        }
    },

    /**
     * @param {boolean} [instant]
     */
    hideOtherLayouts: function(instant) {
        this.unify(function(editor) {
            editor.hideLayout(instant);
        }, false);
    },

    /**
     *
     * @returns {boolean}
     */
    isVisible: function() {
        return this.visible;
    },

    /*========================================================================*\
     * Template functions
    \*========================================================================*/

    /**
     * @param {String} name
     * @param {Object} variables
     */
    getTemplate: function(name, variables) {
        var template;
        if (!this.templates[name]) {
            template = $.ui.editor.getTemplate(name, this.options.urlPrefix);
        } else {
            template = this.templates[name];
        }
        // Translate template
        template = template.replace(/_\('(.*?)'\)/g, function(match, string) {
            string = string.replace(/\\(.?)/g, function (s, slash) {
                switch (slash) {
                    case '\\':return '\\';
                    case '0':return '\u0000';
                    case '':return '';
                    default:return slash;
                }
            });
            return _(string);
        });
        // Replace variables
        variables = $.extend({}, this.options, variables || {});
        variables = this.getTemplateVars(variables);
        template = template.replace(/\{\{(.*?)\}\}/g, function(match, variable) {
            return variables[variable];
        });
        return template;
    },

    /**
     * @param {Object} variables
     * @param {String} prefix
     */
    getTemplateVars: function(variables, prefix, depth) {
        prefix = prefix ? prefix + '.' : '';
        var maxDepth = 5;
        if (!depth) depth = 1;
        var result = {};
        for (var name in variables) {
            if (typeof variables[name] === 'object' && depth < maxDepth) {
                var inner = this.getTemplateVars(variables[name], prefix + name, ++depth);
                for (var innerName in inner) {
                    result[innerName] = inner[innerName];
                }
            } else {
                result[prefix + name] = variables[name];
            }
        }
        return result;
    },

    /*========================================================================*\
     * History functions
    \*========================================================================*/
    /**
     *
     */
    historyPush: function() {
        if (!this.historyEnabled) return;
        var html = this.getHtml();
        if (html !== this.historyPeak()) {
            // Reset the future on change
            if (this.present !== this.history.length - 1) {
                this.history = this.history.splice(0, this.present + 1);
            }

            // Add new HTML to the history
            this.history.push(this.getHtml());

            // Mark the persent as the end of the history
            this.present = this.history.length - 1;
        }
    },

    /**
     * @returns {String|null}
     */
    historyPeak: function() {
        if (!this.history.length) return null;
        return this.history[this.present];
    },

    /**
     *
     */
    historyBack: function() {
        if (this.present > 0) {
            this.present--;
            this.setHtml(this.history[this.present]);
            this.historyEnabled = false;
            this.change();
            this.historyEnabled = true;
        }
    },

    /**
     *
     */
    historyForward: function() {
        if (this.present < this.history.length - 1) {
            this.present++;
            this.setHtml(this.history[this.present]);
            this.historyEnabled = false;
            this.change();
            this.historyEnabled = true;
        }
    },

    /*========================================================================*\
     * Buttons
    \*========================================================================*/

    isUiEnabled: function(ui) {
        // Check if we are not automatically enabling UI, and if not, check if the UI was manually enabled
        if (this.options.enableUi === false &&
                typeof this.options.ui[ui] === 'undefined' ||
                this.options.ui[ui] === false) {
            // <debug/>
            return false;
        }

        // Check if we have explicitly disabled UI
        if ($.inArray(ui, this.options.disabledUi) !== -1) {
            return false;
        }

        return true;
    },

    /**
     * @param  {String} ui Name of the UI object to be returned.
     * @return {Object|null} UI object referenced by the given name.
     */
    getUi: function(ui) {
        return this.uiObjects[ui];
    },

    /**
     * @param {Object} options
     */
    uiButton: function(options) {
        return $.extend({
            button: null,
            options: {},
            init: function(name, editor, options, object) {
                var baseClass = name.replace(/([A-Z])/g, function(match) {
                    return '-' + match.toLowerCase();
                });
                // Extend options overriding editor < base class < supplied options < user options
                options = $.extend({}, editor.options, {
                    baseClass: editor.options.baseClass + '-' + baseClass + '-button'
                }, this.options, editor.options.ui[name]);
                // Default title if not set in plugin
                if (!this.title) this.title = _('Unnamed Button');

                // Create the HTML button
                this.button = $('<div/>')
                    .html(this.label || this.title)
                    .addClass(options.baseClass)
                    .attr('name', name)
                    .attr('title', this.title)
                    .val(name);

                if (options.classes) this.button.addClass(options.classes);

                // Prevent losing the selection on the mouse down
                this.button.bind('mousedown.' + object.editor.widgetName, function(e) {
                    e.preventDefault();
                });

                // Bind the click event
                var button = this;
                this.button.bind('mouseup.' + object.editor.widgetName, function(e) {
                    // Prevent losing the selection on the mouse up
                    e.preventDefault();
                    // Call the click event function
                    button.click.apply(object, arguments);
                });

                editor.bind('destroy', $.proxy(function() {
                    this.button.button('destroy').remove();
                }, this));

                // Create the jQuery UI button
                this.button.button({
                    icons: {
                        primary: this.icon || 'ui-icon-' + baseClass
                    },
                    disabled: options.disabled ? true : false,
                    text: this.text || false,
                    label: this.label || null
                });

                this.ready.call(object);

                return this.button;
            },
            disable: function() {
                this.button.button('option', 'disabled', true);
            },
            enable: function() {
                this.button.button('option', 'disabled', false);
            },
            ready: function() {
            },
            click: function() {
            }
        }, options);
    },

    /**
     * @param {Object} options
     */
    uiSelectMenu: function(options) {
        return $.extend({
            // HTML select
            select: null,

            // HTML replacements
            selectMenu: null,
            button: null,
            menu: null,

            // Options passed but the plugin
            options: {},

            init: function(name, editor) {
                var ui = this;

                var baseClass = name.replace(/([A-Z])/g, function(match) {
                    return '-' + match.toLowerCase();
                });

                // Extend options overriding editor < base class < supplied options < user options
                var options = $.extend({}, editor.options, {
                    baseClass: editor.options.baseClass + baseClass + '-select-menu'
                }, ui.options, editor.options.ui[name]);

                // Default title if not set in plugin
                if (!ui.title) ui.title = _('Unnamed Select Menu');

                ui.wrapper =  $('<div class="ui-editor-selectmenu-wrapper"/>')
                    .append(ui.select.hide())
                    .addClass(ui.select.attr('class'));

                ui.selectMenu = $('<div class="ui-editor-selectmenu"/>')
                    .appendTo(ui.wrapper);

                ui.menu = $('<div class="ui-editor-selectmenu-menu ui-widget-content ui-corner-bottom ui-corner-tr"/>')
                    .appendTo(ui.wrapper);

                ui.select.find('option, .ui-editor-selectmenu-option').each(function() {
                    var option = $('<div/>')
                        .addClass('ui-editor-selectmenu-menu-item')
                        .addClass('ui-corner-all')
                        .html($(this).html())
                        .appendTo(ui.menu)
                        .bind('mouseenter.' + editor.widgetName, function() {
                            $(this).addClass('ui-state-focus');
                        })
                        .bind('mouseleave.' + editor.widgetName, function() {
                            $(this).removeClass('ui-state-focus');
                        })
                        .bind('mousedown.' + editor.widgetName, function() {
                            // Prevent losing focus on editable region
                            return false;
                        })
                        .bind('click.' + editor.widgetName, function() {
                            var option = ui.select.find('option, .ui-editor-selectmenu-option').eq($(this).index());
                            var value = option.attr('value') || option.val();
                            ui.select.val(value);
                            ui.update();
                            ui.wrapper.removeClass('ui-editor-selectmenu-visible');
                            ui.button.addClass('ui-corner-all')
                                  .removeClass('ui-corner-top');
                            ui.change(value);
                            return false;
                        });
                });


                var text = $('<div/>')
                    .addClass('ui-editor-selectmenu-text');
                var icon = $('<div/>')
                    .addClass('ui-icon ui-icon-triangle-1-s');
                ui.button = $('<div/>')
                    .addClass('ui-editor-selectmenu-button ui-editor-selectmenu-button ui-button ui-state-default')
                    .attr('title', ui.title)
                    .append(text)
                    .append(icon)
                    .prependTo(ui.selectMenu);
                ui.button
                    .bind('mousedown.' + editor.widgetName, function() {
                        // Prevent losing focus on editable region
                        return false;
                    })
                    .bind('click.' + editor.widgetName, function() {
                        // Do not fire click event when disabled
                        if ($(this).hasClass('ui-state-disabled')) {
                        	return;
                        }
                        if (parseInt(ui.menu.css('min-width')) < ui.button.outerWidth() + 10) {
                            ui.menu.css('min-width', ui.button.outerWidth() + 10);
                        }
                        ui.wrapper.toggleClass('ui-editor-selectmenu-visible');
                        return false;
                    })
                    .bind('mouseenter.' + editor.widgetName, function() {
                        if (!$(this).hasClass('ui-state-disabled')) {
                            $(this).addClass('ui-state-hover', $(this).hasClass('ui-state-disabled'));
                        }
                    })
                    .bind('mouseleave.' + editor.widgetName, function() {
                        $(this).removeClass('ui-state-hover');
                    });

                var selected = ui.select.find('option[value=' + this.select.val() + '], .ui-editor-selectmenu-option[value=' + this.select.val() + ']').html() ||
                    ui.select.find('option, .ui-editor-selectmenu-option').first().html();
                ui.button.find('.ui-editor-selectmenu-text').html(selected);

                return ui.wrapper;
            },
            update: function(value) {
                var selected = this.select.find('option[value=' + this.select.val() + '], .ui-editor-selectmenu-option[value=' + this.select.val() + ']').html();
                this.button.find('.ui-editor-selectmenu-text').html(selected);
            },
            val: function() {
                var result = this.select.val.apply(this.select, arguments);
                this.update();
                return result;
            },
            change: function() {
            }
        }, options);
    },

    /*========================================================================*\
     * Plugins
    \*========================================================================*/
    /**
     * @param {String} name
     * @return {Object|undefined} plugin
     */
    getPlugin: function(name) {
        return this.plugins[name];
    },

    /**
     *
     */
    loadPlugins: function() {
        var editor = this;
        if (!this.options.plugins) this.options.plugins = {};
        for (var name in $.ui.editor.plugins) {
            // Check if we are not automaticly enabling plugins, and if not, check if the plugin was manually enabled
            if (this.options.enablePlugins === false &&
                    typeof this.options.plugins[name] === 'undefined' ||
                    this.options.plugins[name] === false) {
                // <debug/>
                continue;
            }

            // Check if we have explicitly disabled the plugin
            if ($.inArray(name, this.options.disabledPlugins) !== -1) continue;

            // Clone the plugin object (which should be extended from the defaultPlugin object)
            var pluginObject = $.extend({}, $.ui.editor.plugins[name]);

            var baseClass = name.replace(/([A-Z])/g, function(match) {
                return '-' + match.toLowerCase();
            });

            var options = $.extend(true, {}, editor.options, {
                baseClass: editor.options.baseClass + '-' + baseClass
            }, pluginObject.options, editor.options.plugins[name]);

            pluginObject.editor = editor;
            pluginObject.options = options;
            pluginObject.init(editor, options);

            editor.plugins[name] = pluginObject;
        }
    },

    /*========================================================================*\
     * Content accessors
    \*========================================================================*/

    /**
     * @returns {boolean}
     */
    isDirty: function() {
        return this.dirty;
    },

    /**
     * @returns {String}
     */
    getHtml: function() {
        var content = this.getElement().html();

        // Remove saved rangy ranges
        content = $('<div/>').html(content);
        content.find('.rangySelectionBoundary').remove();
        content = content.html();

        return content;
    },

    getCleanHtml: function() {
        this.fire('clean');
        var content = this.getElement().html();
        this.fire('restore');

        // Remove saved rangy ranges
        content = $('<div/>').html(content);
        content.find('.rangySelectionBoundary').remove();
        content = content.html();

        return content;
    },

    /**
     * @param {String} html
     */
    setHtml: function(html) {
        this.getElement().html(html);
        this.fire('html');
        this.change();
    },

    /**
     *
     */
    resetHtml: function() {
        this.setHtml(this.getOriginalHtml());
        this.fire('cleaned');
    },

    /**
     * @returns {String}
     */
    getOriginalHtml: function() {
        return this.originalHtml;
    },

    /**
     *
     */
    save: function() {
        var html = this.getCleanHtml();
        this.fire('save');
        this.setOriginalHtml(html);
        this.fire('saved');
        this.fire('cleaned');
        return html;
    },

    /**
     * @param {String} html
     */
    setOriginalHtml: function(html) {
        this.originalHtml = html;
    },

    /*========================================================================*\
     * Event handling
    \*========================================================================*/
    /**
     * @param {String} name
     * @param {function} callback
     * @param {Object} [context]
     */
    bind: function(name, callback, context) {
        // <strict/>
        var events = this.events;
        $.each(name.split(','), function(i, name) {
            name = $.trim(name);
            if (!events[name]) events[name] = [];
            events[name].push({
                context: context,
                callback: callback
            });
        });
    },

    /**
     * @param {String} name
     * @param {function} callback
     * @param {Object} [context]
     */
    unbind: function(name, callback, context) {

        for (var i = 0, l = this.events[name].length; i < l; i++) {
            if (this.events[name][i]
                && this.events[name][i].callback === callback
                && this.events[name][i].context === context) {
                this.events[name].splice(i, 1);
            }
        }
    },

    /**
     * @param {String} name
     * @param {boolean} [global]
     * @param {boolean} [sub]
     */
    fire: function(name, global, sub) {
        // Fire before sub-event
        if (!sub) this.fire('before:' + name, global, true);

        // <debug/>

        if (this.events[name]) {
            for (var i = 0, l = this.events[name].length; i < l; i++) {
                var event = this.events[name][i];
                if (typeof event.callback !== 'undefined') {
                    event.callback.call(event.context || this);
                }
            }
        }
        // Also trigger the global editor event, unless specified not to
        if (global !== false) {
            $.ui.editor.fire(name);
        }

        // Fire after sub-event
        if (!sub) this.fire('after:' + name, global, true);
    }

});

$.extend($.ui.editor, raptor);
var supported, ios;

function isSupported(editor) {
    if (supported === undefined) {
        supported = true;

        // <ios>
        ios = /(iPhone|iPod|iPad).*AppleWebKit/i.test(navigator.userAgent);
        if (ios) {
            $('html').addClass(editor.options.baseClass + '-ios');

            // Fixed position hack
            if (ios) {
                $(document).bind('scroll', function(){
                    setInterval(function() {
                        $('body').css('height', '+=1').css('height', '-=1');
                    }, 0);
                });
            }
        }
        // </ios>

        if ($.browser.mozilla) {
            $('html').addClass(editor.options.baseClass + '-ff');
        }

        // <ie>
        if ($.browser.msie && $.browser.version < 9) {
            supported = false;

            // Create message modal
            var message = $('<div/>')
                .addClass(editor.options.baseClass + '-unsupported')
                .html(editor.getTemplate('unsupported'))
                .appendTo('body');

            elementBringToTop(message);

            // Close event
            message.find('.' + editor.options.baseClass + '-unsupported-close').click(function() {
                message.remove();
            });
        }
        // </ie>
    }
    return supported;
}/**
 * @fileOverview Text alignment ui components
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */
$.ui.editor.registerUi({

    /**
     * @name $.editor.ui.alignLeft
     * @augments $.ui.editor.defaultUi
     * @class Aligns text left within the selected or nearest block-level element.
     * <br/>
     * Toggles <tt>text-align: left</tt>
     */
    alignLeft: /** @lends $.editor.ui.alignLeft.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            return editor.uiButton({
                title: _('Left Align'),
                click: function() {
                    editor.toggleBlockStyle({
                        'text-align': 'left'
                    }, editor.getElement());
                }
            });
        }
    },

    /**
     * @name $.editor.ui.alignJustify
     * @augments $.ui.editor.defaultUi
     * @class Justifies text within the selected or nearest block-level element.
     * <br/>
     * Toggles <tt>text-align: justify</tt>
     */
    alignJustify: /** @lends $.editor.ui.alignJustify.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            return editor.uiButton({
                title: _('Justify'),
                click: function() {
                    editor.toggleBlockStyle({
                        'text-align': 'justify'
                    }, editor.getElement());
                }
            });
        }
    },

    /**
     * @name $.editor.ui.alignCenter
     * @augments $.ui.editor.defaultUi
     * @class Centers text within the selected or nearest block-level element.
     * <br/>
     * Toggles: <tt>text-align: center</tt>
     */
    alignCenter: /** @lends $.editor.ui.alignCenter.prototype */  {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            return editor.uiButton({
                title: _('Center Align'),
                click: function() {
                    editor.toggleBlockStyle({
                        'text-align': 'center'
                    }, editor.getElement());
                }
            });
        }
    },

    /**
     * @name $.editor.ui.alignRight
     * @augments $.ui.editor.defaultUi
     * @class Aligns text right within the selected or nearest block-level element.
     * <br/>
     * Toggles <tt>text-align: right</tt>
     */
    alignRight: /** @lends $.editor.ui.alignRight.prototype */  {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            return editor.uiButton({
                title: _('Right Align'),
                click: function() {
                    editor.toggleBlockStyle({
                        'text-align': 'right'
                    }, editor.getElement());
                }
            });
        }
    }
});/**
 * @fileOverview Basic text styling ui components
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

$.ui.editor.registerUi({

    /**
     * @name $.editor.ui.textBold
     * @augments $.ui.editor.defaultUi
     * @class Wraps (or unwraps) the selection with &lt;strong&gt; tags
     * <br/>
     * Applies either {@link $.ui.editor.defaults.cssPrefix} + 'bold' or a custom class (if present) to the &lt;strong&gt; element
     */
    textBold: /** @lends $.editor.ui.textBold.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor, options) {
            return this.editor.uiButton({
                title: _('Bold'),
                click: function() {
                    editor.toggleWrapper('strong', { classes: options.classes || options.cssPrefix + 'bold' });
                }
            });
        }
    },

    /**
     * @name $.editor.ui.textItalic
     * @augments $.ui.editor.defaultUi
     * @class Wraps (or unwraps) the selection with &lt;em&gt; tags
     * <br/>
     * Applies either {@link $.ui.editor.defaults.cssPrefix} + 'italic' or a custom class (if present) to the &lt;em&gt; element
     */
    textItalic: /** @lends $.editor.ui.textItalic.prototype */ {
        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor, options) {
            return editor.uiButton({
                title: _('Italic'),
                click: function() {
                    editor.toggleWrapper('em', { classes: options.classes || options.cssPrefix + 'italic' });
                }
            });
        }
    },

    /**
     * @name $.editor.ui.textUnderline
     * @augments $.ui.editor.defaultUi
     * @class Wraps (or unwraps) the selection with &lt;u&gt; tags
     * <br/>
     * Applies either {@link $.ui.editor.defaults.cssPrefix} + 'underline' or a custom class (if present) to the &lt;u&gt; element
     */
    textUnderline: /** @lends $.editor.ui.textUnderline.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor, options) {
            return editor.uiButton({
                title: _('Underline'),
                click: function() {
                    editor.toggleWrapper('u', { classes: options.classes || options.cssPrefix + 'underline' });
                }
            });
        }
    },

    /**
     * @name $.editor.ui.textStrike
     * @augments $.ui.editor.defaultUi
     * @class  Wraps (or unwraps) the selection with &lt;del&gt; tags
     * <br/>
     * Applies either {@link $.ui.editor.defaults.cssPrefix} + 'strike' or a custom class (if present) to the &lt;del&gt; element
     */
    textStrike: /** @lends $.editor.ui.textStrike.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor, options) {
            return editor.uiButton({
                title: _('Strikethrough'),
                click: function() {
                    editor.toggleWrapper('del', { classes: options.classes || options.cssPrefix + 'strike' });
                }
            });
        }
    },

    /**
     * @name $.editor.ui.textSub
     * @augments $.ui.editor.defaultUi
     * @class Wraps (or unwraps) the selection with &lt;sub&gt; tags
     * <br/>
     * Applies either {@link $.ui.editor.defaults.cssPrefix} + 'sub' or a custom class (if present) to the &lt;sub&gt; element
     */
    textSub: /** @lends $.editor.ui.textSub.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor, options) {
            return editor.uiButton({
                title: _('Sub script'),
                click: function() {
                    editor.toggleWrapper('sub', { classes: options.classes || options.cssPrefix + 'sub' });
                }
            });
        }
    },

    /**
     * @name $.editor.ui.textSuper
     * @augments $.ui.editor.defaultUi
     * @class Wraps (or unwraps) the selection with &lt;sup&gt; tags
     * <br/>
     * Applies either {@link $.ui.editor.defaults.cssPrefix} + 'super' or a custom class (if present) to the &lt;sub&gt; element
     */
    textSuper: /** @lends $.editor.ui.textSuper.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor, options) {
            return editor.uiButton({
                title: _('Super script'),
                click: function() {
                    editor.toggleWrapper('sup', { classes: options.classes || options.cssPrefix + 'super' });
                }
            });
        }
    }
});
$.ui.editor.registerUi('textBold', new Button({
    options: {
        title: _('Bold'),
        tag: 'strong',
        classes: null
    },
    init: function() {
        this.parent.init.apply(this, arguments);
        if (this.options.classes === null) {
            this.options.classes = this.options.cssPrefix + 'bold';
        }
    },
    action: function() {
        selectionToggleWrapper('strong', { 
            classes: this.options.classes
        });
    }
}));
/**
 * @fileOverview Blockquote ui component
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

 $.ui.editor.registerUi({
   /**
    * @name $.editor.ui.quoteBlock
    * @augments $.ui.editor.defaultUi
    * @class Wraps (or unwraps) selection in &lt;blockquote&gt; tags
    * <br/>
    * Applies either {@link $.ui.editor.defaults.cssPrefix} + 'blockquote' or a custom class (if present) to the &lt;blockquote&gt; element
    */
    quoteBlock: /** @lends $.editor.ui.quoteBlock.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor, options) {
            return editor.uiButton({
                title: _('Blockquote'),
                icon: 'ui-icon-quote',
                click: function() {
                    editor.toggleWrapper('blockquote', { classes: options.classes || options.cssPrefix + 'blockquote' });
                }
            });
        }
    }
});
/**
 * @fileOverview Cancel plugin & ui component
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

 /**
  * @name $.editor.ui.cancel
  * @augments $.ui.editor.defaultUi
  * @class Cancels editing
  */
$.ui.editor.registerUi({
    cancel: /** @lends $.editor.ui.cancel.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            return editor.uiButton({
                name: 'cancel',
                title: _('Cancel'),
                icons: { primary: 'ui-icon-cancel' },
                dialog: null,
                click: function() {
                    this.confirm();
                }
            });
        },

        /**
         * If the editor is dirty, inform the user that to cancel editing will discard their unsaved changes.
         * If the user accepts of if the editor is not dirty, cancel editing.
         */
        confirm: function() {
            var plugin = this.editor.getPlugin('cancel');
            var editor = this.editor;
            if (!editor.isDirty()) {
                plugin.cancel();
            } else {
                if (!this.dialog) this.dialog = $(editor.getTemplate('cancel.dialog'));
                this.dialog.dialog({
                    modal: true,
                    resizable: false,
                    title: _('Confirm Cancel Editing'),
                    dialogClass: editor.options.dialogClass + ' ' + editor.options.baseClass,
                    show: editor.options.dialogShowAnimation,
                    hide: editor.options.dialogHideAnimation,
                    buttons: [
                        {
                            text: _('OK'),
                            click: function() {
                                plugin.cancel();
                                $(this).dialog('close');
                            }
                        },
                        {
                            text: _('Cancel'),
                            click: function() {
                                $(this).dialog('close');
                            }
                        }
                    ],
                    open: function() {
                        // Apply custom icons to the dialog buttons
                        var buttons = $(this).parent().find('.ui-dialog-buttonpane');
                        buttons.find('button:eq(0)').button({ icons: { primary: 'ui-icon-circle-check' }});
                        buttons.find('button:eq(1)').button({ icons: { primary: 'ui-icon-circle-close' }});
                    },
                    close: function() {
                        $(this).dialog('destroy').remove();
                    }
                });
            }
        }

    }
});

$.ui.editor.registerPlugin({
  /**
    * @name $.editor.plugin.cancel
    * @augments $.ui.editor.defaultPlugin
    * @class Plugin providing cancel functionality
    */
   cancel: /** @lends $.editor.plugin.cancel.prototype */ {

        /**
         * Cancel editing
         * by resetting the editor's html its pre-intitialisation state, hiding the toolbar and disabling editing on the element
         */
        cancel: function() {
            this.editor.unify(function(editor) {
                editor.fire('cancel');
                editor.resetHtml();
                editor.hideToolbar();
                editor.disableEditing();
            });
        }
   }
});
/**
 * @fileOverview Clean plugin & ui component
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

 /**
  * @name $.editor.plugin.clean
  * @augments $.ui.editor.defaultPlugin
  * @class Strips empty tags and unwanted attributes from editing element
  */
  $.ui.editor.registerPlugin('clean', /** @lends $.editor.plugin.clean.prototype */ {

    /**
     * Attributes to be stripped, empty tags to be removed & attributes to be removed if empty
     * @type {Object}
     */
    options: {

        /**
         * Attributes to be completely removed
         * @type {Array}
         */
        stripAttrs: ['_moz_dirty'],

        /**
         * Attribute contents to be stripped
         * @type {Object}
         */
        stripAttrContent: {
            type: '_moz'
        },

        /**
         * Tags to be removed if empty
         * @type {String[]}
         */
        stripEmptyTags: [
            'h1', 'h2', 'h3', 'h4', 'h5',  'h6',
            'p', 'b', 'i', 'u', 'strong', 'em',
            'big', 'small', 'div', 'span'
        ],


        /**
         * Attributes to be removed if empty
         * @type {String[]}
         */
        stripEmptyAttrs: [
            'class', 'id', 'style'
        ],

        /**
         * Tag attributes to remove the domain part of a URL from.
         * @type {Object[]}
         */
        stripDomains: [
            {selector: 'a', attributes: ['href']},
            {selector: 'img', attributes: ['src']}
        ]
    },

    /**
     * Binds {@link $.editor.plugin.clean#clean} to the change event
     * @see $.ui.editor.defaultPlugin#init
     */
    init: function(editor, options) {
        editor.bind('change', this.clean, this);
    },

    /**
     * Removes empty tags and unwanted attributes from the element
     */
    clean: function() {
        var i;
        var editor = this.editor;
        for (i = 0; i < this.options.stripAttrs.length; i++) {
            editor.getElement()
                .find('[' + this.options.stripAttrs[i] + ']')
                .removeAttr(this.options.stripAttrs[i]);
        }
        for (i = 0; i < this.options.stripAttrContent.length; i++) {
            editor.getElement()
                .find('[' + i + '="' + this.options.stripAttrs[i] + '"]')
                .removeAttr(this.options.stripAttrs[i]);
        }
        for (i = 0; i < this.options.stripEmptyTags.length; i++) {
            editor.getElement()
                .find(this.options.stripEmptyTags[i])
                .filter(function() {
                    if ($.trim($(this).html()) !== '') {
                        return false;
                    }
                    if (!$(this).hasClass('rangySelectionBoundary')) {
                        return true;
                    }
                    // Do not clear selection markers if the editor has it in use
                    if (editor.savedSelection !== false) {
                        return false;
                    }
                })
                .remove();
        }
        for (i = 0; i < this.options.stripEmptyAttrs.length; i++) {
            var attr = this.options.stripEmptyAttrs[i];
            editor.getElement()
                .find('[' + this.options.stripEmptyAttrs[i] + ']')
                .filter(function() {
                    return $.trim($(this).attr(attr)) === '';
                }).removeAttr(this.options.stripEmptyAttrs[i]);
        }

        // Strip domains
        var origin = window.location.protocol + '//' + window.location.host,
            protocolDomain = '//' + window.location.host;
        for (i = 0; i < this.options.stripDomains.length; i++) {
            var def = this.options.stripDomains[i];

            // Clean only elements within the editing element
            this.editor.getElement().find(def.selector).each(function() {
                for (var j = 0; j < def.attributes.length; j++) {
                    var attr = $(this).attr(def.attributes[j]);
                    // Do not continue if there are no attributes
                    if (typeof attr === 'undefined') {
                        continue;
                    }
                    if (attr.indexOf(origin) === 0) {
                        $(this).attr(def.attributes[j], attr.substr(origin.length));
                    } else if (attr.indexOf(protocolDomain) === 0) {
                        $(this).attr(def.attributes[j], attr.substr(protocolDomain.length));
                    }
                }
            });
        }
    }
});

$.ui.editor.registerUi({
    /**
      * @name $.editor.ui.clean
      * @augments $.ui.editor.defaultUi
      * @class UI component that calls {@link $.editor.plugin.clean#clean} when clicked
      */
    clean: /** @lends $.editor.ui.clean.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            return editor.uiButton({
                title: _('Remove unnecessary markup from editor content'),
                click: function() {
                    editor.getPlugin('clean').clean();
                }
            });
        }
    }
});
/**
 * @fileOverview
 * @author David Neilsen david@panmedia.co.nz
 */

$.ui.editor.registerUi({

    /**
     * @name $.editor.ui.clearFormatting
     * @augments $.ui.editor.defaultUi
     * @class Removes all formatting (wrapping tags) from the selected text.
     */
    clearFormatting: /** @lends $.editor.ui.clearFormatting.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor, options) {
            return this.editor.uiButton({
                title: _('Clear Formatting'),
                click: function() {
                    var sel = rangy.getSelection();
                    if (sel.rangeCount > 0) {
                        // Create a copy of the selection range to work with
                        var range = sel.getRangeAt(0).cloneRange();

                        // Get the selected content
                        var content = range.extractContents();

                        // Expand the range to the parent if there is no selected content
                        if (fragmentToHtml(content) == '') {
                            editor.expandToParent(range);
                            sel.setSingleRange(range);
                            content = range.extractContents();
                        }

                        content = $('<div/>').append(fragmentToHtml(content)).text();

                        // Get the containing element
                        var parent = range.commonAncestorContainer;
                        while (parent && parent.parentNode != editor.getElement().get(0)) {
                            parent = parent.parentNode;
                        }

                        if (parent) {
                            // Place the end of the range after the paragraph
                            range.setEndAfter(parent);

                            // Extract the contents of the paragraph after the caret into a fragment
                            var contentAfterRangeStart = range.extractContents();

                            // Collapse the range immediately after the paragraph
                            range.collapseAfter(parent);

                            // Insert the content
                            range.insertNode(contentAfterRangeStart);

                            // Move the caret to the insertion point
                            range.collapseAfter(parent);
                            range.insertNode(document.createTextNode(content));
                        } else {
                            range.insertNode(document.createTextNode(content));
                        }
                    }


/**
 * If a entire heading is selected, replace it with a p
 *
 * If part of a heading is selected, remove all inline styles, and disallowed tags from the selection.
 *
 * If content inside a p remove all inline styles, and disallowed tags from the selection.
 *
 * If the selection starts in a heading, then ends in another element, convert all headings to a p.
 *
 */

//                    selectionEachRange(function(range) {
//                        if (range.collapsed) {
//                            // Expand to parent
//                            rangeExpandTo(range, [editor.getElement(), 'p, h1, h2, h3, h4, h5, h6']);
//                        }
//
//                        if (rangeIsWholeElement(range)) {
//
//                        }
//
//                        if (range.endOffset === 0) {
//                            range.setEndBefore(range.endContainer);
//                            console.log(range.endContainer);
//                        }
//                        range.refresh();
//                        console.log(range);
//
////                        console.log(range);
////                        console.log(range.toHtml(), range.toString());
////                        console.log($(range.commonAncestorContainer).html(), $(range.commonAncestorContainer).text());
////                        console.log($(range.toHtml()));
////                        range.splitBoundaries();
////                        console.log(range);
////                        var nodes = range.getNodes([3]);
////                        console.log(nodes);
////                        for (var i = nodes.length - 1; i >= 0; i--) {
////                            console.log(nodes[i]);
////                            console.log($.trim(nodes[i].nodeValue) === '');
////                            //console.log(nodes[i].nodeValue, $.trim(nodes[i].nodeValue));
////                        }
//                        selectionSet(range);
//                    });

                    editor.checkChange();
                }
            });
        }
    }

});
/**
 * @fileOverview Click to edit plugin
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

 /**
  * @name $.editor.plugin.clickToEdit
  * @augments $.ui.editor.defaultPlugin
  * @class Shows a message at the center of an editable block,
  * informing the user that they may click to edit the block contents
  */
$.ui.editor.registerPlugin('clickToEdit', /** @lends $.editor.plugin.clickToEdit.prototype */ {

    /**
     * @see $.ui.editor.defaultPlugin#init
     */
    init: function(editor, options) {
        var plugin = this;
        var message = $(editor.getTemplate('clicktoedit.message', options)).appendTo('body');

        /**
        * Plugin option defaults
        * @type {Object}
        */
        options = $.extend({}, {

            /**
             * @type {Boolean} true if links should be obscured
             */
            obscureLinks: false,
            position: {
                at: 'center center',
                of: editor.getElement(),
                my: 'center center',
                using: function(position) {
                    $(this).css({
                        position: 'absolute',
                        top: position.top,
                        left: position.left
                    });
                }
            }
        }, options);

        this.selection = function() {
            var range;
            if (document.selection) {   // IE
                range = document.selection.createRange();
            } else if (document.getSelection().rangeCount) {    // Others
                range = document.getSelection().getRangeAt(0);
            }
            return range;
        };

        /**
         * Show the click to edit message
         */
        this.show = function() {
            if (editor.isEditing()) return;
            editor.getElement().addClass(options.baseClass + '-highlight');
            editor.getElement().addClass(options.baseClass + '-hover');
            message.position(options.position);
            message.addClass(options.baseClass + '-visible');
        };

        /**
         * Hide the click to edit message
         */
        this.hide = function() {
            editor.getElement().removeClass(options.baseClass + '-highlight');
            editor.getElement().removeClass(options.baseClass + '-hover');
            message.removeClass(options.baseClass + '-visible');
        };

        /**
         * Hide the click to edit message and show toolbar
         */
        this.edit = function() {
            plugin.hide();
            if (!editor.isEditing()) editor.enableEditing();
            if (!editor.isVisible()) editor.showLayout(plugin.selection());
        };

        message.position(options.position);

        // Prevent disabling links if required
        if (!options.obscureLinks) {
            editor.getElement().find('a').bind('mouseenter.' + editor.widgetName, plugin.hide);
            editor.getElement().find('a').bind('mouseleave.' + editor.widgetName, plugin.show);
        }
        editor.getElement().bind('mouseenter.' + editor.widgetName, plugin.show);
        editor.getElement().bind('mouseleave.' + editor.widgetName, plugin.hide);
        editor.getElement().bind('click.' + editor.widgetName, function(event) {
            // Prevent disabling links if required
            if (options.obscureLinks || (!$(event.target).is('a') && !$(event.target).parents('a').length)) {
                plugin.edit();
            }
        });
        editor.bind('destroy', function() {
            message.remove();
            editor.getElement().unbind('mouseenter.' + editor.widgetName, plugin.show);
            editor.getElement().unbind('mouseleave.' + editor.widgetName, plugin.hide);
            editor.getElement().unbind('click.' + editor.widgetName, plugin.edit);
        });
    }
});/**
 * @fileOverview Dock plugin
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * @name $.editor.plugin.dock
 * @augments $.ui.editor.defaultPlugin
 * @see  $.editor.ui.dock
 * @class Allow the user to dock / undock the toolbar from the document body or editing element
 */
$.ui.editor.registerPlugin('dock', /** @lends $.editor.plugin.dock.prototype */ {

    enabled: false,
    docked: false,
    topSpacer: null,
    bottomSpacer: null,

    options: {
        docked: false,
        dockToElement: false,
        dockUnder: false,
        persist: true,
        persistID: null
    },

    /**
     * @see $.ui.editor.defaultPlugin#init
     */
    init: function(editor) {
        this.bind('show', this.show);
        this.bind('hide', this.hide);
        this.bind('disabled', this.disable);
        this.bind('destroy', this.destroy, this);
    },

    show: function() {
        if (!this.enabled) {
            // When the editor is enabled, if persistent storage or options indicate that the toolbar should be docked, dock the toolbar
            if (this.loadState() || this.options.docked) {
                this.dock();
            }
            this.enabled = true;
        } else if (this.isDocked()) {
            this.showSpacers();
        }
    },

    hide: function() {
        this.hideSpacers();
        this.editor.toolbar
            .css('width', 'auto');
    },

    showSpacers: function() {
        if (this.options.dockToElement || !this.editor.toolbar.is(':visible')) {
            return;
        }

        this.topSpacer = $('<div/>')
            .addClass(this.options.baseClass + '-top-spacer')
            .height(this.editor.toolbar.outerHeight())
            .prependTo('body');

        this.bottomSpacer = $('<div/>')
            .addClass(this.options.baseClass + '-bottom-spacer')
            .height(this.editor.path.outerHeight())
            .appendTo('body');

        // Fire resize event to trigger plugins (like unsaved edit warning) to reposition
        this.editor.fire('resize');
    },

    hideSpacers: function() {
        if (this.topSpacer) {
            this.topSpacer.remove();
            this.topSpacer = null;
        }
        if (this.bottomSpacer) {
            this.bottomSpacer.remove();
            this.bottomSpacer = null;
        }

        // Fire resize event to trigger plugins (like unsaved edit warning) to reposition
        this.editor.fire('resize');
    },


    /**
     * Change CSS styles between two values.
     *
     * @param  {Object} to    Map of CSS styles to change to
     * @param  {Object} from  Map of CSS styles to change from
     * @param  {Object} style Map of styles to perform changes within
     * @return {Object} Map of styles that were changed
     */
    swapStyle: function(to, from, style) {
        var result = {};
        for (var name in style) {
            // Apply the style from the 'form' element to the 'to' element
            to.css(name, from.css(name));
            // Save the original style to revert the swap
            result[name] = from.css(name);
            // Apply the reset to the 'from' element'
            from.css(name, style[name]);
        }
        return result;
    },

    /**
     * Set CSS styles to given values.
     *
     * @param  {Object} to    Map of CSS styles to change to
     * @param  {Object} style Map of CSS styles to change within
     */
    revertStyle: function(to, style) {
        for (var name in style) {
            to.css(name, style[name]);
        }
    },

    /**
     * Dock the toolbar to the editing element
     */
    dockToElement: function() {
        var plugin = this;

        // <debug/>

        // Needs to be in the ready event because we cant insert to the DOM before ready (if auto enabling, before ready)
//        $(function() {
//            var element = plugin.editor.getElement()
//                .addClass(plugin.options.baseClass + '-docked-element');
//            plugin.editor.wrapper
//                .addClass(plugin.options.baseClass + '-docked-to-element')
//                .insertBefore(plugin.editor.getElement())
//                .append(element);
//        });

        var wrapper = $('<div/>')
            .insertBefore(this.editor.getElement())
            .addClass(this.options.baseClass + '-docked-to-element-wrapper');

        this.editor.wrapper
            .appendTo(wrapper);

        this.previousStyle = this.swapStyle(wrapper, this.editor.getElement(), {
            'display': 'block',
            'float': 'none',
            'clear': 'none',
            'position': 'static',
            'margin-left': 0,
            'margin-right': 0,
            'margin-top': 0,
            'margin-bottom': 0,
            'outline': 0,
            'width': 'auto'
        });

//        plugin.editor.wrapper.css('display', '');

        wrapper.css('width', wrapper.width() +
            parseInt(this.editor.getElement().css('padding-left'), 10) +
            parseInt(this.editor.getElement().css('padding-right'), 10));/* +
            parseInt(this.editor.getElement().css('border-right-width')) +
            parseInt(this.editor.getElement().css('border-left-width')));*/

        this.editor.getElement()
            .appendTo(this.editor.wrapper)
            .addClass(this.options.baseClass + '-docked-element');
    },

    /**
     * Undock toolbar from editing element
     */
    undockFromElement: function() {
        // <debug/>

//        var wrapper = this.editor.wrapper.parent();

        this.editor.getElement()
            .insertAfter(this.editor.wrapper)
            .removeClass(this.options.baseClass + '-docked-element');

        this.editor.wrapper
            .appendTo('body')
            .removeClass(this.options.baseClass + '-docked-to-element');

//        this.revertStyle(this.editor.getElement(), this.previousStyle);

//        this.editor.dialog('option', 'position', this.editor.dialog('option', 'position'));

//        wrapper.remove();
    },

    /**
     * Dock the toolbar to the document body (top of the screen)
     */
    dockToBody: function() {
        // <debug/>

        var top = 0;
        if ($(this.options.dockUnder).length) {
            top = $(this.options.dockUnder).outerHeight();
        }

        this.top = this.editor.toolbarWrapper.css('top');
        this.editor.toolbarWrapper.css('top', top);
        this.editor.wrapper.addClass(this.options.baseClass + '-docked');

        // Position message wrapper below the toolbar
        this.editor.messages.css('top', top + this.editor.toolbar.outerHeight());
    },

    /**
     * Undock toolbar from document body
     */
    undockFromBody: function() {
        // <debug/>

        this.editor.toolbarWrapper.css('top', this.top);
        // Remove the docked class
        this.editor.wrapper.removeClass(this.options.baseClass + '-docked');

        this.hideSpacers();
    },

    /**
     * Dock toolbar to element or body
     */
    dock: function() {
        if (this.docked) return;

        // Save the state of the dock
        this.docked = this.saveState(true);

        if (this.options.dockToElement) {
            this.dockToElement();
        } else {
            this.dockToBody();
        }

        // Change the dock button icon & title
        var button = this.editor.wrapper
            .find('.' + this.options.baseClass + '-button')
            .button({icons: {primary: 'ui-icon-pin-w'}});

        if (button.attr('title')) {
            button.attr('title', this.getTitle());
        } else {
            button.attr('data-title', this.getTitle());
        }

        // Add the header class to the editor toolbar
        this.editor.toolbar.find('.' + this.editor.options.baseClass + '-inner')
            .addClass('ui-widget-header');

        this.showSpacers();
    },

    /**
     * Undock toolbar
     */
    undock: function() {
        if (!this.docked) return;

        // Save the state of the dock
        this.docked = this.destroying ? false : this.saveState(false);

        // Remove the header class from the editor toolbar
        this.editor.toolbar.find('.' + this.editor.options.baseClass + '-inner')
            .removeClass('ui-widget-header');

        // Change the dock button icon & title
        var button = this.editor.wrapper
            .find('.' + this.options.baseClass + '-button')
            .button({icons: {primary: 'ui-icon-pin-s'}});

        if (button.attr('title')) {
            button.attr('title', this.getTitle());
        } else {
            button.attr('data-title', this.getTitle());
        }

        if (this.options.dockToElement) this.undockFromElement();
        else this.undockFromBody();

        // Trigger the editor resize event to adjust other plugin element positions
        this.editor.fire('resize');
    },

    /**
     * @return {Boolean} True if the toolbar is docked to the editing element or document body
     */
    isDocked: function() {
        return this.docked;
    },

    /**
     * @return {String} Title text for the dock ui button, differing depending on docked state
     */
    getTitle: function() {
        return this.isDocked() ? _('Click to detach the toolbar') : _('Click to dock the toolbar');
    },

    saveState: function(state) {
        if (!this.persist) {
            return;
        }
        if (this.persistID) {
            this.persist('docked:' + this.persistID, state);
        } else {
            this.persist('docked', state);
        }
        return state;
    },

    loadState: function() {
        if (!this.persist) {
            return null;
        }
        if (this.persistID) {
            return this.persist('docked:' + this.persistID);
        }
        return this.persist('docked');
    },

    /**
     * Hide the top and bottom spacers when editing is disabled
     */
    disable: function() {
        this.hideSpacers();
    },

    /**
     * Undock the toolbar
     */
    destroy: function() {
        this.destroying = true;
        this.undock();
    }
});

$.ui.editor.registerUi({

    /**
     * @name $.editor.ui.dock
     * @augments $.ui.editor.defaultUi
     * @see  $.editor.plugin.dock
     * @class Interface for the user to dock / undock the toolbar using the {@link $.editor.plugin.dock} plugin
     */
    dock: /** @lends $.editor.ui.dock.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            return editor.uiButton({
                title: editor.getPlugin('dock').getTitle(),
                icon: editor.getPlugin('dock').isDocked() ? 'ui-icon-pin-w' : 'ui-icon-pin-s',
                click: function() {
                    // Toggle dock on current editor
                    var plugin = editor.getPlugin('dock');
                    if (plugin.isDocked()) plugin.undock();
                    else plugin.dock();

                    // Set (un)docked on all unified editors
                    editor.unify(function(editor) {
                        if (plugin.isDocked()) editor.getPlugin('dock').dock();
                        else editor.getPlugin('dock').undock();
                    });
                }
            });
        }
    }
});
/**
 * @fileOverview embed UI component
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */
 $.ui.editor.registerUi({

    /**
     * @name $.editor.ui.embed
     * @augments $.ui.editor.defaultUi
     * @class Shows a dialog containing the element's markup, allowing the user to edit the source directly
     */
    embed: /** @lends $.editor.ui.embed.prototype */ {

        /**
         * Reference to the embed dialog. Only one dialog avalible for all editors.
         * @type {Object}
         */
        dialog: null,

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor, options) {
            editor.bind('hide', this.hide, this);
            return editor.uiButton({
                icon: 'ui-icon-youtube',
                title: _('Embed object'),
                click: function() {
                    this.show();
                }
            });
        },

        /**
         * Hide, destroy & remove the embed dialog. Enable the button.
         */
        hide: function() {
            if (this.dialog) $(this.dialog).dialog('destroy').remove();
            this.dialog = null;
            $(this.ui.button).button('option', 'disabled', false);
        },

        /**
         * Show the embed dialog. Disable the button.
         */
        show: function() {
            if (!this.dialog) {
                $(this.ui.button).button('option', 'disabled', true);
                var ui = this;

                ui.editor.saveSelection();

                this.dialog = $(this.editor.getTemplate('embed.dialog'));
                this.dialog.dialog({
                    modal: false,
                    width: 600,
                    height: 400,
                    resizable: true,
                    title: _('Paste Embed Code'),
                    autoOpen: true,
                    dialogClass: ui.options.baseClass + ' ' + ui.options.dialogClass,
                    buttons: [
                        {
                            text: _('Embed Object'),
                            click: function() {
                                ui.editor.restoreSelection();
                                ui.editor.replaceSelection($(this).find('textarea').val());
                                $(this).dialog('close');
                            }
                        },
                        {
                            text: _('Close'),
                            click: function() {
                                ui.hide();
                            }
                        }
                    ],
                    open: function() {
                        var buttons = $(this).parent().find('.ui-dialog-buttonpane');
                        buttons.find('button:eq(0)').button({ icons: { primary: 'ui-icon-circle-check' }});
                        buttons.find('button:eq(1)').button({ icons: { primary: 'ui-icon-circle-close' }});

                        // Create fake jQuery UI tabs (to prevent hash changes)
                        var tabs = $(this).find('.ui-editor-embed-panel-tabs');

                        tabs.find('ul li').click(function() {
                            tabs.find('ul li').removeClass('ui-state-active').removeClass('ui-tabs-selected');
                            $(this).addClass('ui-state-active').addClass('ui-tabs-selected');
                            tabs.children('div').hide().eq($(this).index()).show();
                        });

                        var preview = $(this).find('.ui-editor-embed-preview');
                        $(this).find('textarea').change(function() {
                            $(preview).html($(this).val());
                        });

                    },
                    close: function() {
                        ui.hide();
                    }
                });
            }
        }
    }
});/**
 * @name $.editor.plugin.emptyElement
 * @augments $.ui.editor.defaultPlugin
 * @class Automaticly wraps content inside an editable element with a specified tag if it is empty.
 */
$.ui.editor.registerPlugin('emptyElement', /** @lends $.editor.plugin.emptyElement.prototype */ {

    /**
     * @name $.editor.plugin.emptyElement.options
     * @type {Object}
     * @namespace Default options
     * @see $.editor.plugin.emptyElement
     */
    options: /** @lends $.editor.plugin.emptyElement.options */  {

        /**
         * The tag to wrap bare text nodes with.
         * @type {String}
         */
        tag: '<p/>'
    },

    /**
     * @see $.ui.editor.defaultPlugin#init
     */
    init: function(editor, options) {
        this.bind('change', this.change)
    },

    change: function() {
        var plugin = this;
        this.textNodes(this.editor.getElement()).each(function() {
            $(this).wrap($(plugin.options.tag));
            // Set caret position to the end of the current text node
            plugin.editor.selectEnd(this);
        });
        this.editor.checkChange();
    },

    /**
     * Returns the text nodes of an element (not including child elements), filtering
     * out blank (white space only) nodes.
     *
     * @param {jQuerySelector|jQuery|Element} element
     * @returns {jQuery}
     */
    textNodes: function(element) {
        return $(element).contents().filter(function() {
            return this.nodeType == 3 && $.trim(this.nodeValue).length;
        });
    }

});
/**
 * @fileOverview Float ui components
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

 $.ui.editor.registerUi({

    /**
     * @name $.editor.ui.floatLeft
     * @augments $.ui.editor.defaultUi
     * @class Floats the selected or nearest block-level element left
     * <br/>
     * Toggles <tt>float: left</tt>
     */
    floatLeft: /** @lends $.editor.ui.floatLeft.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            return editor.uiButton({
                title: _('Float Image Left'),
                click: function() {
                    selectionEachRange(function(range) {
                        $(range.commonAncestorContainer).find('img').css('float', 'left');
                    });
                }
            });
        }
    },

    /**
     * @name $.editor.ui.floatRight
     * @augments $.ui.editor.defaultUi
     * @class Floats the selected or nearest block-level element right
     * <br/>
     * Toggles <tt>float: right</tt>
     */
    floatRight: /** @lends $.editor.ui.floatRight.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            return editor.uiButton({
                title: _('Float Image Right'),
                click: function() {
                    selectionEachRange(function(range) {
                        $(range.commonAncestorContainer).find('img').css('float', 'right');
                    });
                }
            });
        }
    },

    /**
     * @name $.editor.ui.floatNone
     * @augments $.ui.editor.defaultUi
     * @class Sets float none to the selected or nearest block-level element
     * <br/>
     * Toggles <tt>float: right</tt>
     */
    floatNone: /** @lends $.editor.ui.floatNone.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            return editor.uiButton({
                title: _('Remove Image Float'),
                click: function() {
                    selectionEachRange(function(range) {
                        $(range.commonAncestorContainer).find('img').css('float', 'none');
                    });
                }
            });
        }
    }
});/**
 * @fileOverview Font size ui components
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

 $.ui.editor.registerUi({

    /**
     * @name $.editor.ui.fontSizeInc
     * @augments $.ui.editor.defaultUi
     * @class Wraps selection with &lt;big&gt; tags or unwraps &lt;small&gt; tags from selection
     */
    fontSizeInc: /** @lends $.editor.ui.fontSizeInc.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor, options) {
            return editor.uiButton({
                title: _('Increase Font Size'),
                click: function() {
                    editor.inverseWrapWithTagClass('big', options.cssPrefix + 'big', 'small', options.cssPrefix + 'small');
                }
            });
        }
    },

    /**
     * @name $.editor.ui.fontSizeDec
     * @augments $.ui.editor.defaultUi
     * @class Wraps selection with &lt;small&gt; tags or unwraps &lt;big&gt; tags from selection
     */
    fontSizeDec: /** @lends $.editor.ui.fontSizeDec.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor, options) {
            return editor.uiButton({
                title: _('Decrease Font Size'),
                click: function() {
                    editor.inverseWrapWithTagClass('small', options.cssPrefix + 'small', 'big', options.cssPrefix + 'big');
                }
            });
        }
    }
});
/**
 * @fileOverview Show guides ui component
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */


/**
 * @name $.editor.ui.showGuides
 * @augments $.ui.editor.defaultUi
 * @class Outlines elements contained within the editing element
 */
$.ui.editor.registerUi('showGuides', /** @lends $.editor.ui.showGuides.prototype */ {

    /**
     * @see $.ui.editor.defaultUi#init
     */
    init: function(editor, options) {

        editor.bind('cancel', this.cancel, this);
        editor.bind('destroy', this.cancel, this);

        return editor.uiButton({
            title: _('Show Guides'),
            icon: 'ui-icon-pencil',
            click: function() {
                editor.getElement().toggleClass(options.baseClass + '-visible');
            }
        });
    },

    cancel: function() {
        this.editor.getElement().removeClass(this.options.baseClass + '-visible');
    }
    
});
/**
 * @fileOverview History ui components
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

$.ui.editor.registerUi({

    /**
     * @name $.editor.ui.undo
     * @augments $.ui.editor.defaultUi
     * @class Revert most recent change to element content
     */
    undo: /** @lends $.editor.ui.undo.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            editor.bind('change', this.change, this);

            return editor.uiButton({
                title: _('Step Back'),
                disabled: true,
                click: function() {
                    editor.historyBack();
                }
            });
        },
        change: function() {
            if (this.editor.present === 0) this.ui.disable();
            else this.ui.enable();
        }
    },

    /**
     * @name $.editor.ui.redo
     * @augments $.ui.editor.defaultUi
     * @class Step forward through the stored history
     */
    redo: /** @lends $.editor.ui.redo.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            editor.bind('change', this.change, this);

            return this.ui = editor.uiButton({
                title: _('Step Forward'),
                disabled: true,
                click: function() {
                    editor.historyForward();
                }
            });
        },
        change: function() {
            if (this.editor.present === this.editor.history.length - 1) this.ui.disable();
            else this.ui.enable();
        }
    }
});
/**
 * @fileOverview Insert hr ui component
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */
 $.ui.editor.registerUi({

    /**
     * @name $.editor.ui.hr
     * @augments $.ui.editor.defaultUi
     * @class Shows a message at the center of an editable block,
     * informing the user that they may click to edit the block contents
     */
    hr: /** @lends $.editor.ui.hr.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            return editor.uiButton({
                title: _('Insert Horizontal Rule'),
                click: function() {
                    editor.replaceSelection('<hr/>');
                }
            });
        }
    }
});
/**
 * @fileOverview Internationalization UI component
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */
 $.ui.editor.registerUi({

    /**
     * @name $.editor.ui.i18n
     * @augments $.ui.editor.defaultUi
     * @class Provides a dropdown to allow the user to switch between available localizations
     */
    i18n: /** @lends $.editor.ui.i18n.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor, options) {
            var ui = this;
            var locale = this.persist('locale');
            if (locale) {
                // @todo Move this to the global scope
                setLocale(locale);
            }

            var menu = $('<select autocomplete="off" name="i18n"/>');

            for (var key in locales) {
                var option = $('<option value="' + key + '" class="' + key + '"/>');
                option.html(localeNames[key]);

                if (currentLocale === key) {
                    option.attr('selected', 'selected');
                }

                menu.append(option);
            };

            return editor.uiSelectMenu({
                title: _('Change Language'),
                select: menu,
                change: function(value) {
                    setLocale(ui.persist('locale', value));
                }
            });
        }
    }
});
registerLocale('en', 'English', {
    "A preview of your embedded object is displayed below.": "A preview of your embedded object is displayed below.",
    "Added link: {{link}}": "Added link: {{link}}",
    "All changes will be lost!": "All changes will be lost!",
    "Apply Source": "Apply Source",
    "Are you sure you want to stop editing?": "Are you sure you want to stop editing?",
    "Blockquote": "Blockquote",
    "Bold": "Bold",
    "Cancel": "Cancel",
    "Center Align": "Center Align",
    "Change HTML tag of selected element": "Change HTML tag of selected element",
    "Change Language": "Change Language",
    "Check this box to have the file open in a new browser window": "Check this box to have the file open in a new browser window",
    "Check this box to have the link open in a new browser window": "Check this box to have the link open in a new browser window",
    "Choose a link type:": "Choose a link type:",
    "Click to begin editing": "Click to begin editing",
    "Click to detach the toolbar": "Click to detach the toolbar",
    "Click to dock the toolbar": "Click to dock the toolbar",
    "Click to select all editable content": "Click to select all editable content",
    "Click to select the contents of the '{{element}}' element": "Click to select the contents of the '{{element}}' element",
    "Close": "Close",
    "Confirm Cancel Editing": "Confirm Cancel Editing",
    "Content Statistics": "Content Statistics",
    "Content contains more than {{limit}} characters and may be truncated": "Content contains more than {{limit}} characters and may be truncated",
    "Content will not be truncated": "Content will not be truncated",
    "Copy the file\'s URL from your browser\'s address bar and paste it into the box above": "Copy the file\'s URL from your browser\'s address bar and paste it into the box above",
    "Copy the web address from your browser\'s address bar and paste it into the box above": "Copy the web address from your browser\'s address bar and paste it into the box above",
    "Decrease Font Size": "Decrease Font Size",
    "Destroy": "Destroy",
    "Divider": "Divider",
    "Document or other file": "Document or other file",
    "Edit Link": "Edit Link",
    "Email": "Email",
    "Email address": "Email address",
    "Embed Code": "Embed Code",
    "Embed Object": "Embed Object",
    "Embed object": "Embed object",
    "Ensure the file has been uploaded to your website": "Ensure the file has been uploaded to your website",
    "Enter email address": "Enter email address",
    "Enter subject": "Enter subject",
    "Enter your URL": "Enter your URL",
    "Failed to resize images (error {{error}})": "Failed to resize images (error {{error}})",
    "Failed to save {{failed}} content block(s).": "Failed to save {{failed}} content block(s).",
    "Find the page on the web you want to link to": "Find the page on the web you want to link to",
    "Float Left": "Float Left",
    "Float None": "Float None",
    "Float Right": "Float Right",
    "Formatted &amp; Cleaned": "Formatted &amp; Cleaned",
    "Formatted Unclean": "Formatted Unclean",
    "Heading&nbsp;1": "Heading&nbsp;1",
    "Heading&nbsp;2": "Heading&nbsp;2",
    "Heading&nbsp;3": "Heading&nbsp;3",
    "Increase Font Size": "Increase Font Size",
    "Initializing": "Initializing",
    "Insert": "Insert",
    "Insert Horizontal Rule": "Insert Horizontal Rule",
    "Insert Link": "Insert Link",
    "Insert Snippet": "Insert Snippet",
    "Italic": "Italic",
    "Justify": "Justify",
    "Learn More About the Raptor WYSIWYG Editor": "Learn More About the Raptor WYSIWYG Editor",
    "Left Align": "Left Align",
    "Link to a document or other file": "Link to a document or other file",
    "Link to a page on this or another website": "Link to a page on this or another website",
    "Link to an email address": "Link to an email address",
    "Location": "Location",
    "N/A": "N/A",
    "New window": "New window",
    "No changes detected to save...": "No changes detected to save...",
    "Not sure what to put in the box above?": "Not sure what to put in the box above?",
    "OK": "OK",
    "Open the uploaded file in your browser": "Open the uploaded file in your browser",
    "Ordered List": "Ordered List",
    "Page on this or another website": "Page on this or another website",
    "Paragraph": "Paragraph",
    "Paste Embed Code": "Paste Embed Code",
    "Paste your embed code into the text area below.": "Paste your embed code into the text area below.",
    "Plain Text": "Plain Text",
    "Preview": "Preview",
    "Raptorize": "Raptorize",
    "Reinitialise": "Reinitialise",
    "Remaining characters before the recommended character limit is reached": "Remaining characters before the recommended character limit is reached",
    "Remove Link": "Remove Link",
    "Remove unnecessary markup from editor content": "Remove unnecessary markup from editor content",
    "Resizing image(s)": "Resizing image(s)",
    "Right Align": "Right Align",
    "Save": "Save",
    "Saved {{saved}} out of {{dirty}} content blocks.": "Saved {{saved}} out of {{dirty}} content blocks.",
    "Saving changes...": "Saving changes...",
    "Select all editable content": "Select all editable content",
    "Select {{element}} element": "Select {{element}} element",
    "Show Guides": "Show Guides",
    "Source Code": "Source Code",
    "Step Back": "Step Back",
    "Step Forward": "Step Forward",
    "Strikethrough": "Strikethrough",
    "Sub script": "Sub script",
    "Subject (optional)": "Subject (optional)",
    "Successfully saved {{saved}} content block(s).": "Successfully saved {{saved}} content block(s).",
    "Super script": "Super script",
    "The URL does not look well formed": "The URL does not look well formed",
    "The email address does not look well formed": "The email address does not look well formed",
    "The image \"{{image}}\" is too large for the element being edited.<br/>It has been resized with CSS.": "The image \"{{image}}\" is too large for the element being edited.<br/>It has been resized with CSS.",
    "The image \"{{image}}\" is too large for the element being edited.<br/>It will be replaced with a resized copy when your edits are saved.": "The image \"{{image}}\" is too large for the element being edited.<br/>It will be replaced with a resized copy when your edits are saved.",
    "The url for the file you inserted doesn\'t look well formed": "The url for the file you inserted doesn\'t look well formed",
    "The url for the link you inserted doesn\'t look well formed": "The url for the link you inserted doesn\'t look well formed",
    "This block contains unsaved changes": "This block contains unsaved changes",
    "Underline": "Underline",
    "Unnamed Button": "Unnamed Button",
    "Unnamed Select Menu": "Unnamed Select Menu",
    "Unordered List": "Unordered List",
    "Update Link": "Update Link",
    "Updated link: {{link}}": "Updated link: {{link}}",
    "View / Edit Source": "View / Edit Source",
    "View Source": "View Source",
    "\nThere are unsaved changes on this page. \nIf you navigate away from this page you will lose your unsaved changes": "\nThere are unsaved changes on this page. \nIf you navigate away from this page you will lose your unsaved changes",
    "ctrl + b": "ctrl + b",
    "ctrl + i": "ctrl + i",
    "ctrl + s": "ctrl + s",
    "ctrl + u": "ctrl + u",
    "ctrl + y": "ctrl + y",
    "ctrl + z": "ctrl + z",
    "esc": "esc",
    "root": "root",
    "{{charactersRemaining}} characters over limit": "{{charactersRemaining}} characters over limit",
    "{{charactersRemaining}} characters remaining": "{{charactersRemaining}} characters remaining",
    "{{characters}} characters, {{charactersRemaining}} over the recommended limit": "{{characters}} characters, {{charactersRemaining}} over the recommended limit",
    "{{characters}} characters, {{charactersRemaining}} remaining": "{{characters}} characters, {{charactersRemaining}} remaining",
    "{{images}} image(s) have been replaced with resized versions": "{{images}} image(s) have been replaced with resized versions",
    "{{sentences}} sentences": "{{sentences}} sentences",
    "{{words}} word": "{{words}} word",
    "{{words}} words": "{{words}} words"
});
/**
 * @fileOverview Spanish strings file.
 * @author Francisco Martínez (JnxF), paco.7070@hotmail.com, https://twitter.com/ElJnxF
 */
registerLocale('es', 'Español', {
    "A preview of your embedded object is displayed below.": "A continuación se muestra una vista previa de su objeto incrustado.",
    "Added link: {{link}}": "Enlace añadido: {{link}}",
    "All changes will be lost!": "¡Todos los cambios serán perdidos!",
    "Apply Source": "Aplicar Fuente",
    "Are you sure you want to stop editing?": "¿Está seguro de que desea detener la edición?",
    "Blockquote": "Cita en bloque",
    "Bold": "Negrita",
    "Cancel": "Cancelar",
    "Center Align": "Centrar",
    "Change HTML tag of selected element": "Cambiar la etiqueta HTML del elemento seleccionado",
    "Change Language": "Cambiar Idioma",
    "Check this box to have the file open in a new browser window": "Marque esta casilla para que el archivo se abra en una nueva ventana",
    "Check this box to have the link open in a new browser window": "Marque esta casilla para que el enlace se abra en una nueva ventana",
    "Choose a link type:": "Escoja un tipo de enlace:",
    "Clear Formatting": "Limpiar Formato",
    "Click to begin editing": "Haga clic para empezar a editar",
    "Click to detach the toolbar": "Haga clic para desanclar la barra de herramientas",
    "Click to dock the toolbar": "Haga clic para anclar la barra de herramientas",
    "Click to select all editable content": "Haga clic para seleccionar todo el contenido editable",
    "Click to select the contents of the '{{element}}' element": "Haga clic para selecionar el contenido del elemento '{{element}}'",
    "Close": "Cerrar",
    "Confirm Cancel Editing": "Confirme Cancelar la Edición ",
    "Content Statistics": "Contenidos Estadísticos",
    "Content contains more than {{limit}} characters and may be truncated": "El contenido contiene más de {{limit}} carácteres y debe ser truncado",
    "Content will not be truncated": "El contenido no será truncado",
    "Copy the file\'s URL from your browser\'s address bar and paste it into the box above": "Copie la URL de su archivo desde la barra de dirección de su navegador y péguela en la caja superior",
    "Copy the web address from your browser\'s address bar and paste it into the box above": "Copie la dirección web desde la barra de dirección de su navegador y péguela en la caja superior",
    "Decrease Font Size": "Disminuir Tamaño de Fuente",
    "Destroy": "Destruir",
    "Divider": "Divisor",
    "Document or other file": "Documento u otro archivo",
    "Edit Link": "Editar Enlace",
    "Email": "Correo electrónico",
    "Email address": "Dirección de correo electrónico",
    "Embed Code": "Código Incrustado",
    "Embed Object": "Objeto Incrustado",
    "Embed object": "Objeto incrustado",
    "Ensure the file has been uploaded to your website": "Asegúrese de que el archivo ha sido subido a su sitio web",
    "Enter email address": "Introduzca una dirección de correo electrónico",
    "Enter subject": "Introduzca un sujeto",
    "Enter your URL": "Introduzca su URL",
    "Failed to save {{failed}} content block(s).": "Falló al guardar los bloques del cotenido de {{failed}}.",
    "Find the page on the web you want to link to": "Busque la página web a la que desee enlazar",
    "Float Image Left": "Flotar Imagen a la Izquierda",
    "Float Image Right": "Flotar Imagen a la Derecha",
    "Formatted &amp; Cleaned": "Formateado y Limpiado",
    "Formatted Unclean": "Formateado Sucio",
    "Heading&nbsp;1": "Encabezado&nbsp;1",
    "Heading&nbsp;2": "Encabezado&nbsp;2",
    "Heading&nbsp;3": "Encabezado&nbsp;3",
    "Image height": "Altura de imagen",
    "Image width": "Ancho de imagen",
    "Increase Font Size": "Incrementar Tamaño de Fuente",
    "Initializing": "Inicializando",
    "Insert": "Insertar",
    "Insert Horizontal Rule": "Insertar Línea Horizontal",
    "Insert Link": "Insertar Enlace",
    "Insert Snippet": "Insertar Snippet",
    "Italic": "Cursiva",
    "Justify": "Justificar",
    "Learn More About the Raptor WYSIWYG Editor": "Saber más sobre el editor WYSIWYG Raptor",
    "Left Align": "Alinear a la Izquierda",
    "Link to a document or other file": "Enlazar a un documento o a otro archivo",
    "Link to a page on this or another website": "Enlazar a una página en esta u otra página web",
    "Link to an email address": "Enlazar a una dirección de correo electrónico",
    "Location": "Localización",
    "Modify Image Size": "Cambiar Tamaño de Imagen",
    "N/A": false,
    "New window": "Nueva ventana",
    "No changes detected to save...": "No se detectaron cambios para guardar...",
    "Not sure what to put in the box above?": "¿No está seguro de qué poner en la caja anterior?",
    "OK": "Aceptar",
    "Open the uploaded file in your browser": "Abra el archivo cargado en su navegador",
    "Ordered List": "Lista Ordenada",
    "Page on this or another website": "Página en ésta u otra página web",
    "Paragraph": "Párrafo",
    "Paste Embed Code": "Pegar Código Incrustado",
    "Paste your embed code into the text area below.": "Pegue su código incrustado en la caja de texto posterior.",
    "Plain Text": "Texto Llano",
    "Preview": "Previsualizar",
    "Raptorize": "Raptorizar",
    "Reinitialise": "Reinicializar",
    "Remaining characters before the recommended character limit is reached": "Carácteres restantes antes de que se alcance el límite de cáracteres recomendado",
    "Remove Image Float": "No Flotar Imagen",
    "Remove Link": "Eliminar enlace",
    "Remove unnecessary markup from editor content": "Eliminar marcado innecesario del editor de contenido",
    "Resize Image": "Redimensionar Imagen",
    "Right Align": "Alinear a la Derecha",
    "Save": "Guardar",
    "Saved {{saved}} out of {{dirty}} content blocks.": "Guardados {{saved}} de {{dirty}} bloques de contenido.",
    "Saving changes...": "Guardando cambios...",
    "Select all editable content": "Seleccionar todo el contenido editable",
    "Select {{element}} element": "Seleccionar el elemento {{element}}",
    "Show Guides": "Mostrar Guías",
    "Source Code": "Código Fuente",
    "Step Back": "Deshacer",
    "Step Forward": "Rehacer",
    "Strikethrough": "Tachado",
    "Sub script": "Subíndice",
    "Subject (optional)": "Sujeto (opcional)",
    "Successfully saved {{saved}} content block(s).": "Guardado exitosamente {{saved}} bloque(s) de contenido.",
    "Super script": "Superíndice",
    "The URL does not look well formed": "La URL no parece bien formada",
    "The email address does not look well formed": "El enlace de correo electrónico no parece bien formado",
    "The image \'{{image}}\' is too large for the element being edited.<br/>It will be replaced with a resized copy when your edits are saved.": "La imagen \'{{image}}\' es demasiado grande para el elemento que está siendo editado.<br/>Será reemplazada por una copia redimensionada cuando se guarden sus cambios.",
    "The url for the file you inserted doesn\'t look well formed": "La URL del archivo que ha introducido no parece bien formada",
    "The url for the link you inserted doesn\'t look well formed": "La URL del enlace que ha introducido no parece bien formada",
    "This block contains unsaved changes": "Este bloque tiene cambios sin guardar",
    "Underline": "Subrayar",
    "Unnamed Button": "Botón sin Nombre",
    "Unnamed Select Menu": "Menú de Selección sin Nombre",
    "Unordered List": "Lista Desordenada",
    "Update Link": "Actualizar Enlace",
    "Updated link: {{link}}": "Enlace actualizado: {{link}}",
    "View / Edit Source": "Ver / Editar Código Fuente",
    "View Source": "Ver Código Fuente",
    "\nThere are unsaved changes on this page. \nIf you navigate away from this page you will lose your unsaved changes": "\nHay cambios sin guardar en esta página. \nSi sale de esta página, perderá todos los cambios sin guardar",
    "root": "orígen",
    "{{charactersRemaining}} characters over limit": "{{charactersRemaining}} carácter(es) sobre el límite",
    "{{charactersRemaining}} characters remaining": "Queda(n) {{charactersRemaining}} carácter(es)",
    "{{characters}} characters, {{charactersRemaining}} over the recommended limit": "{{characters}} carácter(es), {{charactersRemaining}} sobre el límite recomendado",
    "{{characters}} characters, {{charactersRemaining}} remaining": "{{characters}} carácter(es), queda(n) {{charactersRemaining}}",
    "{{sentences}} sentences": "{{sentences}} oraciones",
    "{{words}} word": "{{words}} palabra",
    "{{words}} words": "{{words}} palabras"
});
/* French translation by SebCorbin (contact: seb.corbin@gmail.com) */
registerLocale('fr', 'Français', {
    "A preview of your embedded object is displayed below.": "Un aperçu de votre objet intégré est affiché ci-dessous.",
    "Added link: {{link}}": "Lien ajouté : {{link}}",
    "All changes will be lost!": "Toutes les modifications seront perdues !",
    "Apply Source": "Appliquer la source",
    "Are you sure you want to stop editing?": "Êtes-vous sûr(e) de vouloir arrêter la modification ?",
    "Blockquote": "Citation",
    "Bold": "Gras",
    "Cancel": "Annuler",
    "Center Align": "Aligner au centre",
    "Change HTML tag of selected element": "Modifier la balise HTML de l'élément sélectionné",
    "Change Language": "Changer de langue",
    "Check this box to have the file open in a new browser window": "Cochez cette case pour ouvrir le fichier dans une nouvelle fenêtre de navigateur",
    "Check this box to have the link open in a new browser window": "Cochez cette case pour ouvrir le lien dans une nouvelle fenêtre de navigateur",
    "Choose a link type:": "Choisissez un type de lien :",
    "Click to begin editing": "Cliquer pour commencer la modification",
    "Click to detach the toolbar": "Cliquer pour détacher la barre d'outils",
    "Click to dock the toolbar": "Cliquer pour ancrer la barre d'outils",
    "Click to select all editable content": "Cliquer pour sélectionner tout le contenu modifiable",
    "Click to select the contents of the '{{element}}' element": "Cliquer pour sélectionner le contenu de l'élément '{{element}}'",
    "Close": "Fermer",
    "Confirm Cancel Editing": "Confirmer l'annulation des modifications",
    "Content Statistics": "Statistiques de contenu",
    "Content contains more than {{limit}} characters and may be truncated": "Le contenu contient plus de {{limit}} caractères et peut être tronqué",
    "Content will not be truncated": "Le contenu ne sera pas tronqué",
    "Copy the file\'s URL from your browser\'s address bar and paste it into the box above": "Copiez l'URL du fichier depuis la barre d'adresse de votre navigateur et collez-la dans le champ ci-dessus",
    "Copy the web address from your browser\'s address bar and paste it into the box above": "Copiez l'adresse web depuis la barre d'adresse de votre navigateur et collez-la dans le champ ci-dessus",
    "Decrease Font Size": "Diminuer la taille de la police",
    "Destroy": "Détruire",
    "Divider": "Div",
    "Document or other file": "Document ou autre fichier",
    "Edit Link": "Modifier le lien",
    "Email": "E-mail",
    "Email address": "Adresse e-mail",
    "Embed Code": "Code intégré",
    "Embed Object": "Intégrer l'objet",
    "Embed object": "Object intégré",
    "Ensure the file has been uploaded to your website": "Vérifiez que le fichier a été transféré vers votre site",
    "Enter email address": "Saisir l'adresse e-mail",
    "Enter subject": "Saisir le sujet",
    "Enter your URL": "Saisir l'URL",
    "Failed to resize images (error {{error}})": "Échec de redimensionnement des images (erreur {{error}})",
    "Failed to save {{failed}} content block(s).": "Échec d'enregistrement du(des) bloc(s) de contenu {{failed}}.",
    "Find the page on the web you want to link to": "Trouvez la page web que vous voulez lier",
    "Float Left": "Flotter à gauche",
    "Float None": "Ne pas flotter",
    "Float Right": "Flotter à droite",
    "Formatted &amp; Cleaned": "Formatté &amp; Nettoyé",
    "Formatted Unclean": "Formatté non nettoyé",
    "Heading&nbsp;1": "Titre&nbsp;1",
    "Heading&nbsp;2": "Titre&nbsp;2",
    "Heading&nbsp;3": "Titre&nbsp;3",
    "Increase Font Size": "Augmenter la taille de la police",
    "Initializing": "Initialisation",
    "Insert": "Insérer",
    "Insert Horizontal Rule": "Insérer une règle horizontale",
    "Insert Link": "Insérer un lien",
    "Insert Snippet": "Insérer un bout de code",
    "Italic": "Italique",
    "Justify": "Justifier",
    "Learn More About the Raptor WYSIWYG Editor": "En savoir plus sur l'éditeur WYSIWYG Raptor",
    "Left Align": "Aligner à gauche",
    "Link to a document or other file": "Lier un document ou un autre fichier",
    "Link to a page on this or another website": "Lier une page ou un autre site",
    "Link to an email address": "Lier une adresse e-mail",
    "Location": "Emplacement",
    "N/A": "N/A",
    "New window": "Nouvelle fenêtre",
    "No changes detected to save...": "Aucune modification détectée à enregistrer...",
    "Not sure what to put in the box above?": "Pas sûr(e) de savoir quoi mettre dans le champ ci-dessus ?",
    "OK": "OK",
    "Open the uploaded file in your browser": "Ouvrir le fichier trasnféré dans votre navigateur",
    "Ordered List": "Liste ordonnée",
    "Page on this or another website": "Page sur ce site ou un autre site",
    "Paragraph": "Paragraphe",
    "Paste Embed Code": "Coller le code",
    "Paste your embed code into the text area below.": "Collez votre code intégré dans la zone de texte ci-dessous.",
    "Plain Text": "Texte brut",
    "Preview": "Aperçu",
    "Raptorize": "Raptoriser",
    "Reinitialise": "Réinitialiser",
    "Remaining characters before the recommended character limit is reached": "Caractères restants avant que la limite de caractère recommandée ne soit atteinte",
    "Remove Link": "Retirer le lien",
    "Remove unnecessary markup from editor content": "Retirer le balisage non nécessaire du contenu de l'éditeur",
    "Resizing image(s)": "Redimensionnement de(s) image(s)",
    "Right Align": "Aligner à droite",
    "Save": "Enregistrer",
    "Saved {{saved}} out of {{dirty}} content blocks.": "{{saved}} enregistré sur {{dirty}} blocs de contenu.",
    "Saving changes...": "Enregistrement des modifications...",
    "Select all editable content": "Sélectionner tout le contenu modifiable",
    "Select {{element}} element": "Sélectionner l'élément {{element}}",
    "Show Guides": "Afficher les guides",
    "Source Code": "Code source",
    "Step Back": "En arrière",
    "Step Forward": "En avant",
    "Strikethrough": "Barré",
    "Sub script": "Indice",
    "Subject (optional)": "Sujet (facultatif)",
    "Successfully saved {{saved}} content block(s).": "{{saved}} bloc(s) de contenu enregistré(s) avec succès.",
    "Super script": "Exposant",
    "The URL does not look well formed": "L'URL paraît malformée",
    "The email address does not look well formed": "L'adresse e-mail paraît malformée",
    "The image \"{{image}}\" is too large for the element being edited.<br/>It has been resized with CSS.": "L'image \"{{image}}\" est trop grande pour l'élément en cours de modification.<br/>Elle a été redimensionnée en CSS.",
    "The image \"{{image}}\" is too large for the element being edited.<br/>It will be replaced with a resized copy when your edits are saved.": "L'image \"{{image}}\" est trop grande pour l'élément en cours de modification.<br/>Elle sera remplacée par une copie redimensionnée quand vos modifications seront enregistrées.",
    "The url for the file you inserted doesn\'t look well formed": "L'url du fichier que vous avez inséré paraît malformée",
    "The url for the link you inserted doesn\'t look well formed": "L'url du lien que vous avez inséré paraît malformée",
    "This block contains unsaved changes": "Ce bloc contient des modifications non enregistrées",
    "Underline": "Souligné",
    "Unnamed Button": "Boutton sans nom",
    "Unnamed Select Menu": "Menu de sélection sans nom",
    "Unordered List": "Liste non ordonnée",
    "Update Link": "Mettre à jour le lien",
    "Updated link: {{link}}": "Lien mis à jour : {{link}}",
    "View / Edit Source": "Voir / Modifier la source",
    "View Source": "Voir la source",
    "\nThere are unsaved changes on this page. \nIf you navigate away from this page you will lose your unsaved changes": "\nIl y a des modifications non enregistrées sur cette page. \nSi vous quittez cette page, vous perdrez vos modifications non enregistrées",
    "ctrl + b": "ctrl + b",
    "ctrl + i": "ctrl + i",
    "ctrl + s": "ctrl + s",
    "ctrl + u": "ctrl + u",
    "ctrl + y": "ctrl + y",
    "ctrl + z": "ctrl + z",
    "esc": "esc",
    "root": "racine",
    "{{charactersRemaining}} characters over limit": "{{charactersRemaining}} caractères au-dessus de la limite",
    "{{charactersRemaining}} characters remaining": "{{charactersRemaining}} caractères restants",
    "{{characters}} characters, {{charactersRemaining}} over the recommended limit": "{{characters}} caractères, {{charactersRemaining}} au-dessus de la limite",
    "{{characters}} characters, {{charactersRemaining}} remaining": "{{characters}} caractères, {{charactersRemaining}} restants",
    "{{images}} image(s) have been replaced with resized versions": "{{images}} image(s) a(ont) été remplacée(s) par une version redimensionnée",
    "{{sentences}} sentences": "{{sentences}} phrases",
    "{{words}} word": "{{words}} mot",
    "{{words}} words": "{{words}} mots"
});
/**
 * @fileOverview Dutch strings file.
 * @author Ruben Vincenten, rubenvincenten@gmail.com, https://github.com/rubenvincenten
 */
registerLocale('nl', 'Nederlands', {
    "A preview of your embedded object is displayed below.": "Een voorbeeldweergave van uw ingenestelde object is hieronder weergeven.",
    "Added link: {{link}}": "Link toegevoegd:: {{link}}",
    "All changes will be lost!": "Alle aanpassingen zullen verloren gaan!",
    "Apply Source": "Broncode toepassen",
    "Are you sure you want to stop editing?": "Weet u zeker dat u wilt stoppen met aanpassen? ",
    "Blockquote": "Blokcitaat",
    "Bold": "Vetgedrukt",
    "Cancel": "Annuleren",
    "Center Align": "Centreren",
    "Change HTML tag of selected element": "Verander type van geselecteerd element",
    "Change Language": "Taal veranderen",
    "Check this box to have the file open in a new browser window": "Vink dit aan om het bestand te laten opnenen in een nieuw browser venster",
    "Check this box to have the link open in a new browser window": "Vink dit aan om de link te laten opnenen in een nieuw browser venster",
    "Choose a link type:": "Kies het type link:",
    "Clear Formatting": "Verwijder opmaak",
    "Click to begin editing": "Klik hier voor het beginnen met bewerken",
    "Click to detach the toolbar": "Klik om de werkbalk los te maken",
    "Click to dock the toolbar": "Klik om de werkbalk vast te maken",
    "Click to select all editable content": "Klik om alle bewerkbare inhoud te selecteren",
    "Click to select the contents of the '{{element}}' element": "Klik om de inhoud te selecteren van het '{{element}}' element",
    "Close": "Sluiten",
    "Confirm Cancel Editing": "Bevestig annuleren van bewerken",
    "Content Statistics": "Inhoud Statistieken",
    "Content contains more than {{limit}} characters and may be truncated": "Inhoud bevat meer dan {{limit}} tekens en kan worden ingekort.",
    "Content will not be truncated": "Inhoud wordt niet ingekort",
    "Copy the file's URL from your browser's address bar and paste it into the box above": "Kopieër het internetadres van het bestand uit de adresbalk van uw browser en plak het in het veld hierboven",
    "Copy the web address from your browser\'s address bar and paste it into the box above": "Kopieër het internetadres uit de adresbalk van uw browser en plak het in het veld hierboven",
    "Decrease Font Size": "Groter Lettertype",
    "Destroy": "Verwijder",
    "Divider": "Splitser",
    "Document or other file": "Document of ander bestand",
    "Edit Link": "Link bewerken",
    "Email": "E-mail",
    "Email address": "E-mail adres",
    "Embed Code": "Code Insluiten",
    "Embed Object": "Object Insluiten",
    "Embed object": "Object insluiten",
    "Ensure the file has been uploaded to your website": "Verzeker uzelf ervan dat het bestand op uw website staat",
    "Enter email address": "Voeg het e-mail adres in",
    "Enter subject": "Voeg het onderwerp in",
    "Enter your URL": "Voeg het internetadres in",
    "Failed to save {{failed}} content block(s).": "Kon {{failed}} inhoud blok(ken) niet opslaan.",
    "Find the page on the web you want to link to": "Vind de pagina op het internet waar u naartoe wilt linken",
    "Float Image Left": "Tekst omsluiten rechts van afbeelding",
    "Float Image Right": "Tekst omsluiten links van afbeelding",
    "Formatted &amp; Cleaned": "Geformatteerd &amp; Opgeruimd",
    "Formatted Unclean": "Rommel Opgeruimd",
    "Heading&nbsp;1": "Kopniveau&nbsp;1",
    "Heading&nbsp;2": "Kopniveau&nbsp;2",
    "Heading&nbsp;3": "Kopniveau&nbsp;3",
    "Image height": "Hoogte afbeelding",
    "Image width": "Breedte afbeelding",
    "Increase Font Size": "Kleiner Lettertype",
    "Initializing": "Initialiseren",
    "Insert": "Invoegen",
    "Insert Horizontal Rule": "Horizontale Regel Invoegen",
    "Insert Link": "Link Invoegen",
    "Insert Snippet": "Snippertekst Invoegen",
    "Italic": "Schuingedrukt",
    "Justify": "Uitlijnen aan beide kanten",
    "Learn More About the Raptor WYSIWYG Editor": "Meer leren over Rapor WYSIWYG Editor",
    "Left Align": "Links uitlijnen",
    "Link to a document or other file": "Link naar een document of ander bestand",
    "Link to a page on this or another website": "Link naar een pagina op deze of een andere website",
    "Link to an email address": "Link naar een emailadres",
    "Location": "Locatie",
    "Modify Image Size": "Afbeeldingsgrootte aanpassen",
    "N/A": "n.v.t.",
    "New window": "Nieuw venster",
    "No changes detected to save...": "Er zijn geen aanpassingen om op te slaan...",
    "Not sure what to put in the box above?": "Onzeker over wat er in het veld moet staan hierboven?",
    "OK": false,
    "Open the uploaded file in your browser": "Open het geüploade bestand in uw browser",
    "Ordered List": "Genummerde lijst",
    "Page on this or another website": "Pagina op deze of een andere website",
    "Paragraph": "Alinea",
    "Paste Embed Code": "Plak de insluitcode",
    "Paste your embed code into the text area below.": "Plak de insluitcode in het tekstveld hieronder.",
    "Plain Text": "Tekst zonder opmaak",
    "Preview": "Voorbeeldweergave",
    "Raptorize": false,
    "Reinitialise": "Herinitialiseren",
    "Remaining characters before the recommended character limit is reached": "Aantal karakters over voordat het limiet is bereikt",
    "Remove Image Float": "Tekst niet omsluiten rondom afbeelding",
    "Remove Link": "Verwijder Link",
    "Remove unnecessary markup from editor content": "Inhoud schoonmaken van overbodige opmaak",
    "Resize Image": "Herschaal Afbeelding",
    "Right Align": "Rechts Uitlijnen",
    "Save": "Opslaan",
    "Saved {{saved}} out of {{dirty}} content blocks.": "{{saved}} van de {{dirty}} inhoudsblokken zijn opgeslagen.",
    "Saving changes...": "Aanpassingen opslaan...",
    "Select all editable content": "Alle aanpasbare inhoud selecteren",
    "Select {{element}} element": "Selecteer {{element}} element",
    "Show Guides": "Rooster Tonen (Onderwatermodus)",
    "Source Code": "Broncode",
    "Step Back": "Herstel",
    "Step Forward": "Opnieuw",
    "Strikethrough": "Doorstrepen",
    "Sub script": "Subscript",
    "Subject (optional)": "Onderwerp (optioneel)",
    "Successfully saved {{saved}} content block(s).": "{{saved}} inhoudsblok(ken) succesvol opgeslagen.",
    "Super script": "Superscript",
    "The URL does not look well formed": "Het lijkt er op dat het internetadres niet correct is",
    "The email address does not look well formed": "Het e-mail adres is incorrect",
    "The image \'{{image}}\' is too large for the element being edited.<br/>It will be replaced with a resized copy when your edits are saved.": "De afbeelding \"{{image}}\" is te groot voor het element dat wordt bewerkt.<br/>Het zal worden vervangen met een herschaalde kopie wanneer uw aanpassingen worden opgeslagen.",
    "The url for the file you inserted doesn\'t look well formed": "Het lijkt er op dat het internetadres voor het bestand dat u heeft ingevoegd niet correct is",
    "The url for the link you inserted doesn\'t look well formed": "Het lijkt er op dat het internetadres voor de link die u heeft ingevoegd niet correct is",
    "This block contains unsaved changes": "Dit blok bevat aanpassingen welke niet zijn opgeslagen",
    "Underline": "Onderstrepen",
    "Unnamed Button": "Knop Zonder Naam",
    "Unnamed Select Menu": "Selectiemenu Zonder Naam",
    "Unordered List": "Lijst Van Opsommingstekens",
    "Update Link": "Link Bijwerken",
    "Updated link: {{link}}": "Link bijgewerkt: {{link}}",
    "View / Edit Source": "Broncode Bekijken/Bewerken",
    "View Source": "Broncode Bekijken",
    "\nThere are unsaved changes on this page. \nIf you navigate away from this page you will lose your unsaved changes": "\nEr zijn aanpassingen op deze pagina die niet zijn opgeslagen. \nAls u een andere pagina opnet zult u deze aanpassingen verliezen",
    "root": false,
    "{{charactersRemaining}} characters over limit": "{{charactersRemaining}} karakters over het limiet",
    "{{charactersRemaining}} characters remaining": "{{charactersRemaining}} karakters over",
    "{{characters}} characters, {{charactersRemaining}} over the recommended limit": "{{characters}} karakters, {{charactersRemaining}} over het aangeraden limiet",
    "{{characters}} characters, {{charactersRemaining}} remaining": "{{characters}} karakters, {{charactersRemaining}} over",
    "{{sentences}} sentences": "{{sentences}} zinnen",
    "{{words}} word": "{{words}} woord",
    "{{words}} words": "{{words}} woorden"
});
/**
 * @fileOverview Simplified Chinese strings file.
 * @author Raptor, info@raptor-editor.com, http://www.raptor-editor.com/
 */
registerLocale('zh-CN', '简体中文', {
    "A preview of your embedded object is displayed below.": "A preview of your embedded object is displayed below.",
    "Added link: {{link}}": "Added link: {{link}}",
    "All changes will be lost!": "All changes will be lost!",
    "Apply Source": "应用源代码",
    "Are you sure you want to stop editing?": "Are you sure you want to stop editing?",
    "Blockquote": "大段引用",
    "Bold": "粗体",
    "Cancel": "取消",
    "Center Align": "中心对齐文本",
    "Change HTML tag of selected element": "Change HTML tag of selected element",
    "Change Language": "改变语言",
    "Check this box to have the file open in a new browser window": "Check this box to have the file open in a new browser window",
    "Check this box to have the link open in a new browser window": "Check this box to have the link open in a new browser window",
    "Choose a link type:": "Choose a link type:",
    "Clear Formatting": "Clear Formatting",
    "Click to begin editing": "Click to begin editing",
    "Click to detach the toolbar": "Click to detach the toolbar",
    "Click to dock the toolbar": "Click to dock the toolbar",
    "Click to select all editable content": "Click to select all editable content",
    "Click to select the contents of the '{{element}}' element": "Click to select the contents of the '{{element}}' element",
    "Close": "Close",
    "Confirm Cancel Editing": "确认取消编辑",
    "Content Statistics": "Content Statistics",
    "Content contains more than {{limit}} characters and may be truncated": "Content contains more than {{limit}} characters and may be truncated",
    "Content will not be truncated": "Content will not be truncated",
    "Copy the file's URL from your browser's address bar and paste it into the box above": "Copy the file's URL from your browser's address bar and paste it into the box above",
    "Copy the web address from your browser\'s address bar and paste it into the box above": "Copy the web address from your browser\'s address bar and paste it into the box above",
    "Decrease Font Size": "Decrease Font Size",
    "Destroy": "Destroy",
    "Divider": "Divider",
    "Document or other file": "Document or other file",
    "Edit Link": "Edit Link",
    "Email": "Email",
    "Email address": "电子邮件",
    "Embed Code": "Embed Code",
    "Embed Object": "Embed Object",
    "Embed object": "Embed object",
    "Ensure the file has been uploaded to your website": "Ensure the file has been uploaded to your website",
    "Enter email address": "Enter email address",
    "Enter subject": "Enter subject",
    "Enter your URL": "Enter your URL",
    "Failed to save {{failed}} content block(s).": "Failed to save {{failed}} content block(s).",
    "Find the page on the web you want to link to": "Find the page on the web you want to link to",
    "Float Image Left": "Float Image Left",
    "Float Image Right": "Float Image Right",
    "Formatted &amp; Cleaned": "Formatted &amp; Cleaned",
    "Formatted Unclean": "Formatted Unclean",
    "Heading&nbsp;1": "Heading&nbsp;1",
    "Heading&nbsp;2": "Heading&nbsp;2",
    "Heading&nbsp;3": "Heading&nbsp;3",
    "Image height": "Image height",
    "Image width": "Image width",
    "Increase Font Size": "Increase Font Size",
    "Initializing": "Initializing",
    "Insert": "Insert",
    "Insert Horizontal Rule": "插入水平线",
    "Insert Link": "Insert Link",
    "Insert Snippet": "Insert Snippet",
    "Italic": "斜体字",
    "Justify": "对齐文字",
    "Learn More About the Raptor WYSIWYG Editor": "Learn More About the Raptor WYSIWYG Editor",
    "Left Align": "左对齐文本",
    "Link to a document or other file": "Link to a document or other file",
    "Link to a page on this or another website": "Link to a page on this or another website",
    "Link to an email address": "Link to an email address",
    "Location": "Location",
    "Modify Image Size": "Modify Image Size",
    "N/A": "N/A",
    "New window": "New window",
    "No changes detected to save...": "No changes detected to save...",
    "Not sure what to put in the box above?": "Not sure what to put in the box above?",
    "OK": "确定",
    "Open the uploaded file in your browser": "Open the uploaded file in your browser",
    "Ordered List": "Ordered List",
    "Page on this or another website": "Page on this or another website",
    "Paragraph": "Paragraph",
    "Paste Embed Code": "Paste Embed Code",
    "Paste your embed code into the text area below.": "Paste your embed code into the text area below.",
    "Plain Text": "Plain Text",
    "Preview": "Preview",
    "Raptorize": "Raptorize",
    "Reinitialise": "Reinitialise",
    "Remaining characters before the recommended character limit is reached": "Remaining characters before the recommended character limit is reached",
    "Remove Image Float": "Remove Image Float",
    "Remove Link": "Remove Link",
    "Remove unnecessary markup from editor content": "Remove unnecessary markup from editor content",
    "Resize Image": "Resize Image",
    "Right Align": "右对齐文本",
    "Save": "存储",
    "Saved {{saved}} out of {{dirty}} content blocks.": "Saved {{saved}} out of {{dirty}} content blocks.",
    "Saving changes...": "保存更改...",
    "Select all editable content": "Select all editable content",
    "Select {{element}} element": "Select {{element}} element",
    "Show Guides": "纲要",
    "Source Code": "Source Code",
    "Step Back": "Step Back",
    "Step Forward": "Step Forward",
    "Strikethrough": "Strikethrough",
    "Sub script": "Sub script",
    "Subject (optional)": "Subject (optional)",
    "Successfully saved {{saved}} content block(s).": "Successfully saved {{saved}} content block(s).",
    "Super script": "Super script",
    "The URL does not look well formed": "The URL does not look well formed",
    "The email address does not look well formed": "The email address does not look well formed",
    "The image \'{{image}}\' is too large for the element being edited.<br/>It will be replaced with a resized copy when your edits are saved.": "The image \'{{image}}\' is too large for the element being edited.<br/>It will be replaced with a resized copy when your edits are saved.",
    "The url for the file you inserted doesn\'t look well formed": "The url for the file you inserted doesn\'t look well formed",
    "The url for the link you inserted doesn\'t look well formed": "The url for the link you inserted doesn\'t look well formed",
    "This block contains unsaved changes": "This block contains unsaved changes",
    "Underline": "下划线",
    "Unnamed Button": "Unnamed Button",
    "Unnamed Select Menu": "Unnamed Select Menu",
    "Unordered List": "Unordered List",
    "Update Link": "Update Link",
    "Updated link: {{link}}": "Updated link: {{link}}",
    "View / Edit Source": "View / Edit Source",
    "View Source": "View Source",
    "\nThere are unsaved changes on this page. \nIf you navigate away from this page you will lose your unsaved changes": "\nThere are unsaved changes on this page. \nIf you navigate away from this page you will lose your unsaved changes",
    "root": "本",
    "{{charactersRemaining}} characters over limit": "{{charactersRemaining}} characters over limit",
    "{{charactersRemaining}} characters remaining": "{{charactersRemaining}} characters remaining",
    "{{characters}} characters, {{charactersRemaining}} over the recommended limit": "{{characters}} characters, {{charactersRemaining}} over the recommended limit",
    "{{characters}} characters, {{charactersRemaining}} remaining": "{{characters}} characters, {{charactersRemaining}} remaining",
    "{{sentences}} sentences": "{{sentences}} sentences",
    "{{words}} word": "{{words}} word",
    "{{words}} words": "{{words}} words"
});
registerLocale('zh_CN', '简体中文', {
    "A preview of your embedded object is displayed below.": "A preview of your embedded object is displayed below.",
    "Added link: {{link}}": "Added link: {{link}}",
    "All changes will be lost!": "All changes will be lost!",
    "Apply Source": "应用源代码",
    "Are you sure you want to stop editing?": "Are you sure you want to stop editing?",
    "Blockquote": "大段引用",
    "Bold": "粗体",
    "Cancel": "取消",
    "Center Align": "中心对齐文本",
    "Change HTML tag of selected element": "Change HTML tag of selected element",
    "Change Language": "改变语言",
    "Check this box to have the file open in a new browser window": "Check this box to have the file open in a new browser window",
    "Check this box to have the link open in a new browser window": "Check this box to have the link open in a new browser window",
    "Choose a link type:": "Choose a link type:",
    "Click to begin editing": "Click to begin editing",
    "Click to detach the toolbar": "Click to detach the toolbar",
    "Click to dock the toolbar": "Click to dock the toolbar",
    "Click to select all editable content": "Click to select all editable content",
    "Click to select the contents of the '{{element}}' element": "Click to select the contents of the '{{element}}' element",
    "Close": "Close",
    "Confirm Cancel Editing": "确认取消编辑",
    "Content Statistics": "Content Statistics",
    "Content contains more than {{limit}} characters and may be truncated": "Content contains more than {{limit}} characters and may be truncated",
    "Content will not be truncated": "Content will not be truncated",
    "Copy the file\'s URL from your browser\'s address bar and paste it into the box above": "Copy the file\'s URL from your browser\'s address bar and paste it into the box above",
    "Copy the web address from your browser\'s address bar and paste it into the box above": "Copy the web address from your browser\'s address bar and paste it into the box above",
    "Decrease Font Size": "Decrease Font Size",
    "Destroy": "Destroy",
    "Divider": "Divider",
    "Document or other file": "Document or other file",
    "Edit Link": "Edit Link",
    "Email": "Email",
    "Email address": "电子邮件",
    "Embed Code": "Embed Code",
    "Embed Object": "Embed Object",
    "Embed object": "Embed object",
    "Ensure the file has been uploaded to your website": "Ensure the file has been uploaded to your website",
    "Enter email address": "Enter email address",
    "Enter subject": "Enter subject",
    "Enter your URL": "Enter your URL",
    "Failed to resize images (error {{error}})": "Failed to resize images (error {{error}})",
    "Failed to save {{failed}} content block(s).": "Failed to save {{failed}} content block(s).",
    "Find the page on the web you want to link to": "Find the page on the web you want to link to",
    "Float Left": "Float Left",
    "Float None": "Float None",
    "Float Right": "Float Right",
    "Formatted &amp; Cleaned": "Formatted &amp; Cleaned",
    "Formatted Unclean": "Formatted Unclean",
    "Heading&nbsp;1": "Heading&nbsp;1",
    "Heading&nbsp;2": "Heading&nbsp;2",
    "Heading&nbsp;3": "Heading&nbsp;3",
    "Increase Font Size": "Increase Font Size",
    "Initializing": "Initializing",
    "Insert": "Insert",
    "Insert Horizontal Rule": "插入水平线",
    "Insert Link": "Insert Link",
    "Insert Snippet": "Insert Snippet",
    "Italic": "斜体字",
    "Justify": "对齐文字",
    "Learn More About the Raptor WYSIWYG Editor": "Learn More About the Raptor WYSIWYG Editor",
    "Left Align": "左对齐文本",
    "Link to a document or other file": "Link to a document or other file",
    "Link to a page on this or another website": "Link to a page on this or another website",
    "Link to an email address": "Link to an email address",
    "Location": "Location",
    "N/A": "N/A",
    "New window": "New window",
    "No changes detected to save...": "No changes detected to save...",
    "Not sure what to put in the box above?": "Not sure what to put in the box above?",
    "OK": "确定",
    "Open the uploaded file in your browser": "Open the uploaded file in your browser",
    "Ordered List": "Ordered List",
    "Page on this or another website": "Page on this or another website",
    "Paragraph": "Paragraph",
    "Paste Embed Code": "Paste Embed Code",
    "Paste your embed code into the text area below.": "Paste your embed code into the text area below.",
    "Plain Text": "Plain Text",
    "Preview": "Preview",
    "Raptorize": "Raptorize",
    "Reinitialise": "Reinitialise",
    "Remaining characters before the recommended character limit is reached": "Remaining characters before the recommended character limit is reached",
    "Remove Link": "Remove Link",
    "Remove unnecessary markup from editor content": "Remove unnecessary markup from editor content",
    "Resizing image(s)": "Resizing image(s)",
    "Right Align": "右对齐文本",
    "Save": "存储",
    "Saved {{saved}} out of {{dirty}} content blocks.": "Saved {{saved}} out of {{dirty}} content blocks.",
    "Saving changes...": "保存更改...",
    "Select all editable content": "Select all editable content",
    "Select {{element}} element": "Select {{element}} element",
    "Show Guides": "纲要",
    "Source Code": "Source Code",
    "Step Back": "Step Back",
    "Step Forward": "Step Forward",
    "Strikethrough": "Strikethrough",
    "Sub script": "Sub script",
    "Subject (optional)": "Subject (optional)",
    "Successfully saved {{saved}} content block(s).": "Successfully saved {{saved}} content block(s).",
    "Super script": "Super script",
    "The URL does not look well formed": "The URL does not look well formed",
    "The email address does not look well formed": "The email address does not look well formed",
    "The image \"{{image}}\" is too large for the element being edited.<br/>It has been resized with CSS.": "The image \"{{image}}\" is too large for the element being edited.<br/>It has been resized with CSS.",
    "The image \"{{image}}\" is too large for the element being edited.<br/>It will be replaced with a resized copy when your edits are saved.": "The image \"{{image}}\" is too large for the element being edited.<br/>It will be replaced with a resized copy when your edits are saved.",
    "The url for the file you inserted doesn\'t look well formed": "The url for the file you inserted doesn\'t look well formed",
    "The url for the link you inserted doesn\'t look well formed": "The url for the link you inserted doesn\'t look well formed",
    "This block contains unsaved changes": "This block contains unsaved changes",
    "Underline": "下划线",
    "Unnamed Button": "Unnamed Button",
    "Unnamed Select Menu": "Unnamed Select Menu",
    "Unordered List": "Unordered List",
    "Update Link": "Update Link",
    "Updated link: {{link}}": "Updated link: {{link}}",
    "View / Edit Source": "View / Edit Source",
    "View Source": "View Source",
    "\nThere are unsaved changes on this page. \nIf you navigate away from this page you will lose your unsaved changes": "\nThere are unsaved changes on this page. \nIf you navigate away from this page you will lose your unsaved changes",
    "ctrl + b": "ctrl + b",
    "ctrl + i": "ctrl + i",
    "ctrl + s": "ctrl + s",
    "ctrl + u": "ctrl + u",
    "ctrl + y": "ctrl + y",
    "ctrl + z": "ctrl + z",
    "esc": "esc",
    "root": "本",
    "{{charactersRemaining}} characters over limit": "{{charactersRemaining}} characters over limit",
    "{{charactersRemaining}} characters remaining": "{{charactersRemaining}} characters remaining",
    "{{characters}} characters, {{charactersRemaining}} over the recommended limit": "{{characters}} characters, {{charactersRemaining}} over the recommended limit",
    "{{characters}} characters, {{charactersRemaining}} remaining": "{{characters}} characters, {{charactersRemaining}} remaining",
    "{{images}} image(s) have been replaced with resized versions": "{{images}} image(s) have been replaced with resized versions",
    "{{sentences}} sentences": "{{sentences}} sentences",
    "{{words}} word": "{{words}} word",
    "{{words}} words": "{{words}} words"
});
/**
 * @name $.editor.plugin.imageResize
 * @augments $.ui.editor.defaultPlugin
 * @class Automatically resize oversized images with CSS and height / width attributes.
 */
$.ui.editor.registerPlugin('imageResize', /** @lends $.editor.plugin.imageResize.prototype */ {

    /**
     * @name $.editor.plugin.imageResize.options
     * @type {Object}
     * @namespace Default options
     * @see $.editor.plugin.imageResize
     */
    options: /** @lends $.editor.plugin.imageResize.options */  {
        allowOversizeImages: false,
        manuallyResizingClass: '',
        resizeButtonClass: '',
        resizingClass: ''
    },

    /**
     * @see $.ui.editor.defaultPlugin#init
     */
    init: function(editor, options) {

        this.options = $.extend(this.options, {
            manuallyResizingClass: this.options.baseClass + '-manually-resize',
            resizeButtonClass: this.options.baseClass + '-resize-button',
            resizingClass: this.options.baseClass + '-in-progress'
        });

        editor.bind('enabled', this.bind, this);
    },

    /**
     * Bind events
     */
    bind: function() {

        if (!this.options.allowOversizeImages) {
            this.addImageListeners();
            this.editor.bind('change', this.scanForOversizedImages, this);
            this.editor.bind('save', this.save, this);
        }

        this.editor.bind('destroy', this.cancel, this);
        this.editor.bind('cancel', this.cancel, this);

        this.editor.getElement().on('mouseenter.' + this.options.baseClass, 'img', $.proxy(this.imageMouseEnter, this));
        this.editor.getElement().on('mouseleave.' + this.options.baseClass, 'img', $.proxy(this.imageMouseLeave, this));
    },

    /**
     * Remove bindings from editing element.
     */
    unbind: function() {
        if (!this.options.allowOversizeImages) {
            this.removeImageListeners();
            this.editor.unbind('change', this.scanForOversizedImages, this);
        }
        this.editor.getElement().off('mouseenter.' + this.options.baseClass, 'img');
        this.editor.getElement().off('mouseleave.' + this.options.baseClass, 'img');
    },

    /**
     * Add custom image change listeners to editing element's image elements.
     */
    addImageListeners: function() {
        // If the function addEventListener exists, bind our custom image resized event
        this.resized = $.proxy(this.imageResizedByUser, this);
        var plugin = this;
        this.editor.getElement().find('img').each(function(){
            if (this.addEventListener) {
                this.addEventListener('DOMAttrModified', plugin.resized, false);
            }
            if (this.attachEvent) {  // Internet Explorer and Opera
                this.attachEvent('onpropertychange', plugin.resized);
            }
        });
    },

    /**
     * Remove custom image change listeners to editing element's image elements.
     */
    removeImageListeners: function() {
        var plugin = this;
        this.editor.getElement().find('img').each(function(){
            if (this.removeEventListener) {
                this.addEventListener('DOMAttrModified', plugin.resized, false);
            }
            if (this.detachEvent) {
                this.detachEvent('onpropertychange', plugin.resized);
            }
        });
    },

    /**
     * Handler simulating a 'resize' event for image elements
     * @param {Object} event
     */
    imageResizedByUser: function(event) {
        var target = $(event.target);
        if(target.is('img') &&
            target.attr('_moz_resizing') &&
            event.attrName == 'style' &&
            event.newValue.match(/width|height/)) {
            this.editor.fire('change');
        }
    },

    /**
     * Check for oversize images within the editing element
     */
    scanForOversizedImages: function() {
        var element = this.editor.getElement();
        var plugin = this;
        var images = [];
        $(element.find('img')).each(function() {
            // Only resize images automatically if they're too wide
            if (element.width() < $(this).outerWidth()) {
                images.push($(this));
            }
        });

        if (images.length) {
            plugin.resizeOversizedImages(images, element.width());
        }
    },

    /**
     * Proportionately resizes the image, applying width CSS style.
     * @param  {String[]} image The images to be resized
     * @param  {int} maxWidth The editing element's maximum width
     * @param  {int} maxHeight The editing element's maximum height
     */
    resizeOversizedImages: function(images, maxWidth) {

        // Prepare a link to be included in any messages
        var imageLink = $('<a>', {
            href: '',
            target: '_blank'
        });

        for (var i = 0; i < images.length; i++) {

            var image = images[i];
            var width = image.outerWidth();
            var height = image.outerHeight();
            var ratio = Math.min(maxWidth / width);

            width = Math.round(Math.abs(ratio * (width - (image.outerWidth() - image.width()))));

            image.addClass(this.options.resizingClass);

            imageLink = imageLink.html(image.attr('title') || image.attr('src').substr(image.attr('src').lastIndexOf('/') + 1)).
                    attr('href', image.attr('src'));

            // Resize the image with CSS / attributes
            $(image).css({ width: width });

            var plugin = this;
            this.showOversizeWarning(elementOuterHtml($(imageLink)), {
                hide: function() {
                    image.removeClass(plugin.options.resizingClass);
                }
            });
        }
    },

    cancel: function() {
        this.removeClasses();
        this.removeToolsButtons();
        this.unbind();
    },

    /**
     * Remove resizingClass.
     */
    save: function() {
        this.removeClasses(this.options.resizingClass);
        this.removeToolsButtons();
        this.unbind();
    },

    /**
     * Helper method for showing information about an oversized image to the user
     * @param  {anchor} imageLink link to the subject image
     * @param  {map} options options to be passed to editor.showInfo
     */
    showOversizeWarning: function(imageLink, options) {
        this.editor.showInfo(_('The image "{{image}}" is too large for the element being edited.<br/>It will be replaced with a resized copy when your edits are saved.', {
            image: imageLink
        }), options);
    },

    /**
     * Remove any temporary classes from the editing element's images.
     * @param  {array} classNames to be removed
     */
    removeClasses: function(classNames) {
        if (!classNames) classNames = [this.options.resizingClass, this.options.manuallyResizingClass];
        if (!$.isArray(classNames)) classNames = [classNames];
        for (var i = 0; i < classNames.length; i++) {
            this.editor.getElement().find('img.' + classNames[i]).removeClass(classNames[i]);
        }
    },

    /**
     * Display a dialog containing width / height text inputs allowing the user to manually resize the selected image.
     */
    manuallyResizeImage: function() {
        this.removeToolsButtons();
        var image = this.editor.getElement().find('img.' + this.options.manuallyResizingClass);
        var width = $(image).innerWidth(), height = $(image).innerHeight(),
            widthInputSelector = '#' + this.options.baseClass + '-width',
            heightInputSelector = '#' + this.options.baseClass + '-height',
            plugin = this;

        var updateImageSize = function(width) {
            width = Math.round((width || $(widthInputSelector).val())) + 'px';
            $(image).css({ width: width });
        };

        var dialog = $(this.editor.getTemplate('imageresize.manually-resize-image', {
            width: width,
            height: height,
            baseClass: this.options.baseClass
        }));

        dialog.dialog({
            modal: true,
            resizable: false,
            title: _('Modify Image Size'),
            autoOpen: true,
            buttons: [
                {
                    text: _('Resize Image'),
                    click: function() {
                        updateImageSize();
                        $(this).dialog('close');
                    }
                },
                {
                    text: _('Cancel'),
                    click: function() {
                        $(this).dialog('close');
                    }
                }
            ],
            close: function() {
                updateImageSize(width);
                plugin.editor.checkChange();
                $(dialog).remove();
            },
            open: function() {
                var widthInput = $(this).find(widthInputSelector);
                var heightInput = $(this).find(heightInputSelector);
                widthInput.keyup(function() {
                    heightInput.val(Math.round(Math.abs((height / width) * $(this).val())));
                    updateImageSize();
                });
                heightInput.keyup(function() {
                    widthInput.val(Math.round(Math.abs((width / height) * $(this).val())));
                    updateImageSize();
                });
            }
        });
    },

    /**
     * Create & display a 'tools' button in the top right corner of the image.
     * @param  {jQuery|Element} image The image element to display the button relative to.
     */
    displayToolsButtonRelativeToImage: function(image) {

        var resizeButton = $('<button/>')
            .appendTo('body')
            .addClass(this.options.resizeButtonClass)
            .button({
                text: false,
                icons: {
                    primary: 'ui-icon-tools'
                }
            });

        resizeButton.css({
                position: 'absolute',
                left: ($(image).position().left + $(image).innerWidth() - $(resizeButton).outerWidth() - 10) + 'px',
                marginTop: '10px'
            })
            .click($.proxy(this.manuallyResizeImage, this))

        $(image).before(resizeButton);
    },

    /**
     * Remove any tools buttons inside the editing element.
     */
    removeToolsButtons: function() {
        this.editor.getElement().find('.' + this.options.resizeButtonClass).each(function() {
            $(this).remove();
        })
    },

    /**
     * Handle the mouse enter event.
     * @param  {Event} event The event.
     */
    imageMouseEnter: function(event) {
        $(event.target).addClass(this.options.manuallyResizingClass);
        this.displayToolsButtonRelativeToImage(event.target);
    },

    /**
     * Handle the mouse leave event. If the mouse has left but the related target is a resize button,
     * do not remove the button or the manually resizing class from the image.
     * @param  {Event} event The event.
     */
    imageMouseLeave: function(event) {
        if (!$(event.relatedTarget).hasClass(this.options.resizeButtonClass)) {
            $(event.target).removeClass(this.options.manuallyResizingClass);
            this.removeToolsButtons();
        }
    }
});/**
 * @fileOverview UI Componenent for recommending & tracking maximum content length.
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

$.ui.editor.registerUi({

    /**
     * @name $.editor.ui.length
     * @augments $.ui.editor.defaultUi
     * @class Displays a button containing a character count for the editor content.
     * <br/>
     * Shows a dialog containing more content statistics when clicked
     */
    length: /** @lends $.editor.ui.length.prototype */ {

        ui: null,

        /**
         * @name $.editor.ui.length.options
         * @namespace Default options
         * @see $.editor.ui.length
         * @type {Object}
         */
        options: /** @lends $.editor.ui.length.options.prototype */  {

            /**
             * @see $.editor.ui.length.options
             * @type {Integer}
             */
            length: 150
        },

        /**
         * @see $.ui.editor.length#init
         */
        init: function(editor, options) {
            editor.bind('show', $.proxy(this.updateCount, this));
            editor.bind('change', $.proxy(this.updateCount, this));

            this.ui = this.editor.uiButton({
                title: _('Remaining characters before the recommended character limit is reached'),
                label: _('Initializing'),
                text: true,
                icon: 'ui-icon-dashboard',
                click: function() {
                    this.showStatistics();
                }
            });

            return this.ui;
        },

        /**
         * Update the associated UI element when the content has changed.
         */
        updateCount: function() {
            // <debug/>

            var charactersRemaining = this.options.length - $('<div/>').html(this.editor.getCleanHtml()).text().length;

            var button = this.ui.button;
            var label = null;
            if (charactersRemaining >= 0) {
                label = _('{{charactersRemaining}} characters remaining', { charactersRemaining: charactersRemaining });
            } else {
                label = _('{{charactersRemaining}} characters over limit', { charactersRemaining: charactersRemaining * -1 });
            }
            button.button('option', 'label', label);
            button.button('option', 'text', true);

            // Add the error state to the button's text element if appropriate
            if (charactersRemaining < 0) {
                button.addClass('ui-state-error');
            } else{
                // Add the highlight class if the remaining characters are in the "sweet zone"
                if (charactersRemaining >= 0 && charactersRemaining <= 15) {
                    button.addClass('ui-state-highlight').removeClass('ui-state-error');
                } else {
                    button.removeClass('ui-state-highlight ui-state-error');
                }
            }
        },

        showStatistics: function() {
            var dialog = this.processTemplate();

            dialog.dialog({
                modal: true,
                resizable: false,
                title: _('Content Statistics'),
                dialogClass: this.editor.options.dialogClass + ' ' + this.editor.options.baseClass,
                show: this.editor.options.dialogShowAnimation,
                hide: this.editor.options.dialogHideAnimation,
                buttons: [
                    {
                        text: _('OK'),
                        click: function() {
                            $(this).dialog('close');
                        }
                    }
                ],
                open: function() {
                    // Apply custom icons to the dialog buttons
                    var buttons = $(this).parent().find('.ui-dialog-buttonpane');
                    buttons.find('button:eq(0)').button({ icons: { primary: 'ui-icon-circle-check' }});
                },
                close: function() {
                    $(this).dialog('destroy').remove();
                }
            });
        },

        /**
         * Process and return the statistics dialog template.
         * @return {jQuery} The processed statistics dialog template
         */
        processTemplate: function() {
            var content = $('<div/>').html(this.editor.getCleanHtml()).text();
            var truncation = null;
            var charactersRemaining = this.options.length - content.length;
            if (charactersRemaining < 0) {
                truncation = _('Content contains more than {{limit}} characters and may be truncated', {
                    'limit': this.options.length
                });
            } else {
                truncation = _('Content will not be truncated');
            }

            var words = null;
            var totalWords = content.split(' ').length;
            if (totalWords == 1) {
                words = _('{{words}} word', { 'words': totalWords });
            } else {
                words = _('{{words}} words', { 'words': totalWords });
            }

            var sentences = null;
            var totalSentences = content.split('. ').length;
            if (totalSentences == 1) {
                sentences = _('{{sentences}} sentences', { 'sentences': totalSentences });
            } else {
                sentences = _('{{sentences}} sentences', { 'sentences': totalSentences });
            }

            var characters = null;
            if (charactersRemaining >= 0) {
                characters = _('{{characters}} characters, {{charactersRemaining}} remaining', {
                    'characters': content.length,
                    'charactersRemaining': charactersRemaining
                });
            } else {
                characters = _('{{characters}} characters, {{charactersRemaining}} over the recommended limit', {
                    'characters': content.length,
                    'charactersRemaining': charactersRemaining * -1
                });
            }

            return $(this.editor.getTemplate('length.dialog', {
                'characters': characters,
                'words': words,
                'sentences': sentences,
                'truncation': truncation
            }));
        }
    }
});
/**
 * @fileOverview Link insertion plugin & ui component
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * @name $.editor.plugin.link
 * @augments $.ui.editor.defaultPlugin
 * @see  $.editor.ui.link
 * @see  $.editor.ui.unlink
 * @class Allow the user to wrap the selection with a link or insert a new link
 */
 $.ui.editor.registerPlugin('link', /** @lends $.editor.plugin.link.prototype */ {
    visible: null,
    dialog: null,
    types: {},

    /**
     * Array of default link types
     * @type {Array}
     */
    defaultLinkTypes: [

        /**
         * @name $.editor.plugin.link.defaultLinkTypes.page
         * @class
         * @extends $.editor.plugin.link.baseLinkType
         */
        /** @lends $.editor.plugin.link.defaultLinkTypes.page.prototype */ {

            /**
             * @see $.editor.plugin.link.baseLinkType#type
             */
            type: 'external',

            /**
             * @see $.editor.plugin.link.baseLinkType#title
             */
            title: _('Page on this or another website'),

            /**
             * @see $.editor.plugin.link.baseLinkType#focusSelector
             */
            focusSelector: 'input[name="location"]',

            /**
             * @see $.editor.plugin.link.baseLinkType#init
             */
            init: function() {
                this.content = this.plugin.editor.getTemplate('link.external', this.options);
                return this;
            },

            /**
             * @see $.editor.plugin.link.baseLinkType#show
             */
            show: function(panel, edit) {

                var link = this;
                panel.find('input[name="location"]').bind('keyup', function(){
                    link.validate(panel);
                });

                if (edit) {
                    panel.find('input[name="location"]').val(this.plugin.selectedElement.attr('href')).
                        trigger('keyup');

                    if (this.plugin.selectedElement.attr('target') === '_blank') {
                        panel.find('input[name="blank"]').attr('checked', 'checked');
                    }

                }

                return this;
            },

            /**
             * @see $.editor.plugin.link.baseLinkType#attributes
             */
            attributes: function(panel) {
                var attributes = {
                    href: panel.find('input[name="location"]').val()
                };

                if (panel.find('input[name="blank"]').is(':checked')) attributes.target = '_blank';

                if (!this.options.regexLink.test(attributes.href)) {
                    this.plugin.editor.showWarning(_('The url for the link you inserted doesn\'t look well formed'));
                }

                return attributes;
            },

            /**
             * @return {Boolean} True if the link is valid
             */
            validate: function(panel) {

                var href = panel.find('input[name="location"]').val();
                var errorMessageSelector = '.' + this.options.baseClass + '-error-message-url';
                var isValid = true;

                if (!this.options.regexLink.test(href)) {
                    if (!panel.find(errorMessageSelector).size()) {
                        panel.find('input[name="location"]').after(this.plugin.editor.getTemplate('link.error', $.extend({}, this.options, {
                            messageClass: this.options.baseClass + '-error-message-url',
                            message: _('The URL does not look well formed')
                        })));
                    }
                    panel.find(errorMessageSelector).not(':visible').show();
                    isValid = false;
                } else {
                    panel.find(errorMessageSelector).has(':visible').hide();
                }

                return isValid;
            }
        },

        /**
         * @name $.editor.plugin.link.defaultLinkTypes.email
         * @class
         * @extends $.editor.plugin.link.baseLinkType
         */
        /** @lends $.editor.plugin.link.defaultLinkTypes.email.prototype */  {

            /**
             * @see $.editor.plugin.link.baseLinkType#type
             */
            type: 'email',

            /**
             * @see $.editor.plugin.link.baseLinkType#title
             */
            title: _('Email address'),

            /**
             * @see $.editor.plugin.link.baseLinkType#focusSelector
             */
            focusSelector: 'input[name="email"]',

            /**
             * @see $.editor.plugin.link.baseLinkType#init
             */
            init: function() {
                this.content = this.plugin.editor.getTemplate('link.email', this.options);
                return this;
            },

            /**
             * @see $.editor.plugin.link.baseLinkType#show
             */
            show: function(panel, edit) {

                var email = this;
                panel.find('input[name="email"]').bind('keyup', function(){
                    email.validate(panel);
                });

                if (edit) {
                    panel.find('input[name="email"]').val(this.plugin.selectedElement.attr('href').replace(/(mailto:)|(\?Subject.*)/gi, '')).
                        trigger('keyup');
                    if (/\?Subject\=/i.test(this.plugin.selectedElement.attr('href'))) {
                        panel.find('input[name="subject"]').val(decodeURIComponent(this.plugin.selectedElement.attr('href').replace(/(.*\?Subject=)/i, '')));
                    }
                }

                return this;
            },

            /**
             * @see $.editor.plugin.link.baseLinkType#attributes
             */
            attributes: function(panel) {
                var attributes = {
                    href: 'mailto:' + panel.find('input[name="email"]').val()
                }, subject = panel.find('input[name="subject"]').val();

                if (subject) attributes.href = attributes.href + '?Subject=' + encodeURIComponent(subject);

                return attributes;
            },

            /**
             * @return {Boolean} True if the link is valid
             */
            validate: function(panel) {

                var email = panel.find('input[name="email"]').val();
                var errorMessageSelector = '.' + this.options.baseClass + '-error-message-email';
                var isValid = true;
                if (!this.options.regexEmail.test(email)) {
                    if (!panel.find(errorMessageSelector).size()) {
                        panel.find('input[name="email"]').after(this.plugin.editor.getTemplate('link.error', $.extend({}, this.options, {
                            messageClass: this.options.baseClass + '-error-message-email',
                            message: _('The email address does not look well formed')
                        })));
                    }
                    panel.find(errorMessageSelector).not(':visible').show();
                    isValid = false;
                } else {
                    panel.find(errorMessageSelector).has(':visible').hide();
                }

                return isValid;
            }
        },

        /**
         * @name $.editor.plugin.link.defaultLinkTypes.fileUrl
         * @class
         * @extends $.editor.plugin.link.baseLinkType
         */
        /** @lends $.editor.plugin.link.defaultLinkTypes.fileUrl.prototype */ {

            /**
             * @see $.editor.plugin.link.baseLinkType#type
             */
            type: 'fileUrl',

            /**
             * @see $.editor.plugin.link.baseLinkType#title
             */
            title: _('Document or other file'),

            /**
             * @see $.editor.plugin.link.baseLinkType#focusSelector
             */
            focusSelector: 'input[name="location"]',

            /**
             * @see $.editor.plugin.link.baseLinkType#init
             */
            init: function() {
                this.content = this.plugin.editor.getTemplate('link.file-url', this.options);
                return this;
            },

            /**
             * @see $.editor.plugin.link.baseLinkType#show
             */
            show: function(panel, edit) {

                var link = this;
                panel.find('input[name="location"]').bind('keyup', function(){
                    link.validate(panel);
                });

                if (edit) {
                    panel.find('input[name="location"]').val(this.plugin.selectedElement.attr('href')).
                        trigger('click');
                    if (this.plugin.selectedElement.attr('target') === '_blank') {
                        panel.find('input[name="blank"]').attr('checked', 'checked');
                    }
                }

                return this;
            },

            /**
             * @see $.editor.plugin.link.baseLinkType#attributes
             */
            attributes: function(panel) {
                var attributes = {
                    href: panel.find('input[name="location"]').val()
                };

                if (panel.find('input[name="blank"]').is(':checked')) attributes.target = '_blank';

                if (!this.options.regexLink.test(attributes.href)) {
                    this.plugin.editor.showWarning(_('The url for the file you inserted doesn\'t look well formed'));
                }

                return attributes;
            },

            /**
             * @return {Boolean} True if the link is valid
             */
            validate: function(panel) {

                var href = panel.find('input[name="location"]').val();
                var errorMessageSelector = '.' + this.options.baseClass + '-error-message-file-url';
                var isValid = true;

                if (!this.options.regexLink.test(href)) {
                    if (!panel.find(errorMessageSelector).size()) {
                        panel.find('input[name="location"]').after(this.plugin.editor.getTemplate('link.error', $.extend({}, this.options, {
                            messageClass: this.options.baseClass + '-error-message-file-url',
                            message: _('The URL does not look well formed')
                        })));
                    }
                    panel.find(errorMessageSelector).not(':visible').show();
                    isValid = false;
                } else {
                    panel.find(errorMessageSelector).has(':visible').hide();
                }

                return isValid;
            }
        }

    ],

    /**
     * @see $.ui.editor.defaultPlugin#init
     */
    init: function(editor, options) {

        this.options = $.extend({}, {
            panelAnimation: 'fade',
            replaceTypes: false,
            customTypes: [],
            typeDataName: 'uiWidgetEditorLinkType',
            dialogWidth: 750,
            dialogHeight: 'auto',
            dialogMinWidth: 670,
            regexLink: /^(http|https|ftp):\/\/[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i,
            regexEmail: /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
        }, options);

        editor.bind('save', this.repairLinks, this);
        editor.bind('cancel', this.cancel, this);
    },

    /**
     * Initialise the link types
     * @param  {Boolean} edit True if the user is editing an existing anchor
     */
    initTypes: function(edit) {

        this.types = {};

        /**
         * @name $.editor.plugin.link.baseLinkType
         * @class Default {@link $.editor.plugin.link} type
         * @see $.editor.plugin.link
         */
        var baseLinkType = /** @lends $.editor.plugin.link.baseLinkType.prototype */ {

            /**
             * Name of the link type
             * @type {String}
             */
            type: null,

            /**
             * Title of the link type.
             * Used in the link panel's radio button
             */
            title: null,

            /**
             * Content intended for use in the {@link $.editor.plugin.link} dialog's panel
             */
            content: null,

            /**
             * Reference to the instance of {@link $.editor.plugin.link}
             */
            plugin: this,

            /**
             * Reference to {@link $.editor.plugin.link#options}
             */
            options: this.options,

            /**
             * Function returning the attributes to be applied to the selection
             */
            attributes: function() {},

            /**
             * Initialise the link type
             */
            init: function() {
                return this;
            },

            /**
             * Any actions (binding, population of inputs) required before the {@link $.editor.plugin.link} dialog's panel for this link type is made visible
             */
            show: function() {},

            /**
             * Function determining whether this link type's radio button should be selected
             * @param  {Object} link The selected element
             * @return {Boolean} True if the selection represents a link of this type
             */
            editing: function(link) {
                if (link.attr('class')) {
                    var classes = this.classes.split(/\s/gi);
                    for (var i = 0; i < classes.length; i++) {
                        if (classes[i].trim() && $(link).hasClass(classes[i])) {
                            return true;
                        }
                    }
                }
                return false;
            },

            /**
             * CSS selector for the input that the {@link $.editor.plugin.link.baseLinkType.focus} function should use
             * @type {String}
             */
            focusSelector: null,

            /**
             * Any actions required after this link type's content is made visible
             * @private
             */
            focus: function() {
                if (this.focusSelector) {
                    var input = $(this.focusSelector);
                    var value = input.val();
                    input.val('');
                    input.focus().val(value);
                }
            }
        };

        var linkTypes = null;

        if (this.options.replaceTypes) linkTypes = this.options.customTypes;
        else linkTypes = $.merge(this.defaultLinkTypes, this.options.customTypes);

        var link;
        for (var i = 0; i < linkTypes.length; i++) {
            link = $.extend({}, baseLinkType, linkTypes[i], { classes: this.options.baseClass + '-' + linkTypes[i].type }).init();
            this.types[link.type] = link;
        }
    },

    /**
     * Show the link control dialog
     */
    show: function() {
        if (!this.visible) {

            this.selectedElement = this.editor.getSelectedElements().first();
            var edit = this.selectedElement.is('a');
            var options = this.options;
            var selection = rangy.saveSelection();
            var plugin = this;

            this.dialog = $(this.editor.getTemplate('link.dialog', options)).appendTo('body');

            var dialog = this.dialog;

            this.initTypes();

            // Add link type radio buttons
            var linkTypesFieldset = this.dialog.find('fieldset');
            for (var type in this.types) {
                $(this.editor.getTemplate('link.label', this.types[type])).appendTo(linkTypesFieldset);
            }

            linkTypesFieldset.find('input[type="radio"]').bind('change.' + this.editor.widgetName, function(){
                plugin.typeChange(plugin.types[$(this).val()], edit);
            });

            dialog.dialog({
                autoOpen: false,
                modal: true,
                resizable: true,
                width: options.dialogWidth,
                minWidth: options.dialogMinWidth,
                height: options.dialogHeight,
                title: edit ? _('Edit Link') : _('Insert Link'),
                dialogClass: options.baseClass + ' ' + options.dialogClass,
                buttons: [
                    {
                        text: edit ? _('Update Link') : _('Insert Link'),
                        click: function() {
                            rangy.restoreSelection(selection);

                            if (!plugin.apply(edit)) {
                                selection = rangy.saveSelection();
                            } else {
                                $(this).dialog('close');
                            }
                        }
                    },
                    {
                        text: _('Cancel'),
                        click: function() {
                            rangy.restoreSelection(selection);
                            $(this).dialog('close');
                        }
                    }
                ],
                beforeopen: function() {
                    plugin.dialog.find('.' + plugin.options.baseClass + '-content').hide();
                },
                open: function() {
                    plugin.visible = true;

                    // Apply custom icons to the dialog buttons
                    var buttons = dialog.parent().find('.ui-dialog-buttonpane');
                    buttons.find('button:eq(0)').button({ icons: { primary: 'ui-icon-circle-check' }});
                    buttons.find('button:eq(1)').button({ icons: { primary: 'ui-icon-circle-close' }});

                    var radios = dialog.find('.ui-editor-link-menu input[type="radio"]');
                    radios.first().attr('checked', 'checked');

                    var changedType = false;
                    if (edit) {
                        for(var type in plugin.types) {
                            if (changedType = plugin.types[type].editing(plugin.selectedElement)) {
                                radios.filter('[value="' + type + '"]').attr('checked', 'checked');
                                plugin.typeChange(plugin.types[type], edit);
                                break;
                            }
                        }
                    }

                    if (!edit || edit && !changedType) {
                        plugin.typeChange(plugin.types[radios.filter(':checked').val()], edit);
                    }

                    // Bind keyup to dialog so we can detect when user presses enter
                    $(this).unbind('keyup.' + plugin.editor.widgetName).bind('keyup.' + plugin.editor.widgetName, function(event) {
                        if (event.keyCode == 13) {
                            // Check for and trigger validation - only allow enter to trigger insert if validation not present or successful
                            var linkType = plugin.types[radios.filter(':checked').val()];
                            if (!$.isFunction(linkType.validate) || linkType.validate(plugin.dialog.find('.' + plugin.options.baseClass + '-content'))) {
                                buttons.find('button:eq(0)').trigger('click');
                            }
                        }
                    });
                },
                close: function() {
                    plugin.visible = false;
                    dialog.find('.' + options.baseClass + '-content').hide();
                    $(this).dialog('destroy');
                }
            }).dialog('open');
        }
    },

    /**
     * Apply the link attributes to the selection
     * @param  {Boolean} edit True if this is an edit
     * @return {Boolean} True if the application was successful
     */
    apply: function(edit) {
        var linkType = this.types[this.dialog.find('input[type="radio"]:checked').val()];

        var attributes = linkType.attributes(this.dialog.find('.' + this.options.baseClass + '-content'), edit);

        // No attributes to apply
        if (!attributes) {
            return true;
        }

        // Prepare link to be shown in any confirm message
        var link = elementOuterHtml($('<a>' + (attributes.title ? attributes.title : attributes.href) + '</a>').
                attr($.extend({}, attributes, { target: '_blank' })));

        if (!edit) {
            this.editor.wrapTagWithAttribute('a', $.extend(attributes, { id: this.editor.getUniqueId() }), linkType.classes);
            this.editor.showConfirm(_('Added link: {{link}}', { link: link }));
            this.selectedElement = $('#' + attributes.id).removeAttr('id');
        } else {
            // Remove all link type classes
            this.selectedElement[0].className = this.selectedElement[0].className.replace(new RegExp(this.options.baseClass + '-[a-zA-Z]+','g'), '');
            this.selectedElement.addClass(linkType.classes)
                    .attr(attributes);
            this.editor.showConfirm(_('Updated link: {{link}}', { link: link }));
        }

        this.selectedElement.data(this.options.baseClass + '-href', attributes.href);

        return true;
    },

    /**
     * Update the link control panel's content depending on which radio button is selected
     * @param  {Boolean} edit    True if the user is editing a link
     */
    typeChange: function(linkType, edit) {
        var panel = this.dialog.find('.' + this.options.baseClass + '-content');
        var wrap = panel.closest('.' + this.options.baseClass + '-wrap');
        var ajax = linkType.ajaxUri && !this.types[linkType.type].content;

        if (ajax) wrap.addClass(this.options.baseClass + '-loading');

        var plugin = this;

        panel.hide(this.options.panelAnimation, function(){
            if (!ajax) {
                panel.html(linkType.content);
                linkType.show(panel, edit);
                panel.show(plugin.options.panelAnimation, $.proxy(linkType.focus, linkType));
            } else {
                $.ajax({
                    url: linkType.ajaxUri,
                    type: 'get',
                    success: function(data) {
                        panel.html(data);
                        plugin.types[linkType.type].content = data;
                        wrap.removeClass(plugin.options.baseClass + '-loading');
                        linkType.show(panel, edit);
                        panel.show(plugin.options.panelAnimation, $.proxy(linkType.focus, linkType));
                    }
                });
            }
        });
    },

    /**
     * Remove the link tags from the selection. Expand to the commonAncestor if the user has selected only a portion of an anchor
     */
    remove: function() {
        this.editor.unwrapParentTag('a');
    },

    /**
     * Replace the href for links with their data version, if stored.
     * This is an attempt to workaround browsers that "helpfully" convert relative & root-relative links to their absolute forms.
     */
    repairLinks: function() {
        var ui = this;
        this.editor.getElement().find('a[class^="' + this.options.baseClass + '"]').each(function(){
            if ($(this).data(ui.options.baseClass + '-href')) {
                $(this).attr('href', $(this).data(ui.options.baseClass + '-href'));
            }
        });
    },

    /**
     * Tidy up after the user has canceled editing
     */
    cancel: function() {
        if (this.dialog) $(this.dialog.dialog('close'));
    }

});

$.ui.editor.registerUi({

    /**
     * @name $.editor.ui.link
     * @augments $.ui.editor.defaultUi
     * @see $.ui.editor.defaultUi.unlink
     * @see  $.editor.plugin.link
     * @class Button initiating the insert link plugin
     */
    link: /** @lends $.editor.ui.link.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            editor.bind('selectionChange', this.change, this);

            return editor.uiButton({
                title: _('Insert Link'),
                click: function() {
                    editor.getPlugin('link').show();
                }
            });
        },

        change: function() {
            if (!this.editor.getSelectedElements().length) this.ui.disable();
            else this.ui.enable();
        }
    },

    /**
     * @name $.editor.ui.unlink
     * @augments $.ui.editor.defaultUi
     * @see $.ui.editor.defaultUi.link
     * @see  $.editor.plugin.link
     * @class Button allowing the user to unlink text
     */
    unlink: /** @lends $.editor.ui.unlink.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            editor.bind('selectionChange', this.change, this);
            editor.bind('show', this.change, this);

            return editor.uiButton({
                title: _('Remove Link'),
                click: function() {
                    editor.getPlugin('link').remove();
                }
            });
        },

        /**
         * Enable UI component only when an anchor is selected
         */
        change: function() {
            if (!this.editor.getSelectedElements().is('a')) this.ui.disable();
            else this.ui.enable();
        }
    }
});
/**
 * @fileOverview UI components & plugin for inserting ordered and unordered lists
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */
$.ui.editor.registerPlugin('list', /** @lends $.editor.plugin.list.prototype */ {

    /**
     * @name $.editor.plugin.list.options
     * @type {Object}
     * @namespace Default options
     * @see $.editor.plugin.list
     */
    options: /** @lends $.editor.plugin.list.options */  { },

    /**
     * Tag names for elements that are allowed to contain ul/ol elements.
     * @type {Array}
     */
    validParents: [
        'blockquote', 'body', 'button', 'center', 'dd', 'div', 'fieldset', 'form', 'iframe', 'li',
        'noframes', 'noscript', 'object', 'td', 'th'
    ],

    /**
     * Tag names for elements that may be contained by li elements.
     * @type {Array}
     */
    validChildren: [
        'a', 'abbr','acronym', 'applet', 'b', 'basefont', 'bdo', 'big', 'br', 'button', 'cite', 'code', 'dfn',
        'em', 'font', 'i', 'iframe', 'img', 'input', 'kbd', 'label', 'map', 'object', 'p', 'q', 's',  'samp',
        'select', 'small', 'span', 'strike', 'strong', 'sub', 'sup', 'textarea', 'tt', 'u', 'var'
    ],

    /**
     * Toggle listType depending on the current selection.
     * This function fires both the selectionChange & change events when the action is complete.
     * @param  {string} listType One of ul or ol.
     */
    toggleList: function(listType) {

        // Check whether selection is fully contained by a ul/ol. If so, unwrap parent ul/ol
        if ($(this.editor.getSelectedElements()).is('li')
            && $(this.editor.getSelectedElements()).parent().is(listType)) {
            this.unwrapList();
        } else {
            this.wrapList(listType);
        }

        this.editor.fire('selectionChange');
        this.editor.fire('change');
    },

    /**
     * Extract the contents of all selected li elements.
     * If the list element's parent is not a li, then wrap the content of each li in a p, else leave them unwrapped.
     */
    unwrapList: function() {
        this.editor.saveSelection();

        // Array containing the html contents of each of the selected li elements.
        var listElementsContent = [];
        // Array containing the selected li elements themselves.
        var listElements = [];

        // The element within which selection begins.
        var startElement = this.editor.getSelectionStartElement();
        // The element within which ends.
        var endElement = this.editor.getSelectionEndElement();

        // Collect the first selected list element's content
        listElementsContent.push($(startElement).html());
        listElements.push(startElement);

        // Collect the remaining list elements' content
        if ($(startElement)[0] !== $(endElement)[0]) {
            var currentElement = startElement;
            do  {
                currentElement = $(currentElement).next();
                listElementsContent.push($(currentElement).html());
                listElements.push(currentElement);
            } while($(currentElement)[0] !== $(endElement)[0]);
        }

        // Boolean values used to determine whether first / last list element of the parent is selected.
        var firstLiSelected = $(startElement).prev().length === 0;
        var lastLiSelected = $(endElement).next().length === 0;

        // The parent list container, e.g. the parent ul / ol
        var parentListContainer = $(startElement).parent();

        // Remove the list elements from the DOM.
        for (listElementsIndex = 0; listElementsIndex < listElements.length; listElementsIndex++) {
            $(listElements[listElementsIndex]).remove();
        }

        // Wrap list element content in p tags if the list element parent's parent is not a li.
        for (var listElementsContentIndex = 0; listElementsContentIndex < listElementsContent.length; listElementsContentIndex++) {
            if (!parentListContainer.parent().is('li')) {
                listElementsContent[listElementsContentIndex] = '<p>' + listElementsContent[listElementsContentIndex] + '</p>';
            }
        }

        // Every li of the list has been selected, replace the entire list
        if (firstLiSelected && lastLiSelected) {
            parentListContainer.replaceWith(listElementsContent.join(''));
            this.editor.restoreSelection();
            var selectedElement = this.editor.getSelectedElements()[0];
            this.editor.selectOuter(selectedElement);
            return;
        }

        if (firstLiSelected) {
            $(parentListContainer).before(listElementsContent.join(''));
        } else if (lastLiSelected) {
            $(parentListContainer).after(listElementsContent.join(''));
        } else {
            this.editor.replaceSelectionSplittingSelectedElement(listElementsContent.join(''));
        }

        this.editor.restoreSelection();
        this.editor.checkChange();
    },

    /**
     * Wrap the selection with the given listType.
     * @param  {string} listType One of ul or ol.
     */
    wrapList: function(listType) {
        this.editor.constrainSelection(this.editor.getElement());
        if ($.trim(this.editor.getSelectedHtml()) === '') {
            this.editor.selectInner(this.editor.getSelectedElements());
        }

        var selectedHtml = $('<div>').html(this.editor.getSelectedHtml());

        var listElements = [];
        var plugin = this;

        // Convert child block elements to list elements
        $(selectedHtml).contents().each(function() {
            var liContent;
            // Use only content of block elements
            if ('block' === plugin.getElementDefaultDisplay(this.tagName)) {
                liContent = plugin.editor.stripTags($(this).html(), plugin.validChildren);
            } else {
                liContent = plugin.editor.stripTags(elementOuterHtml($(this)), plugin.validChildren);
            }

            // Avoid inserting blank lists
            var listElement = $('<li>' + liContent + '</li>');
            if ($.trim(listElement.text()) !== '') {
                listElements.push(elementOuterHtml(listElement));
            }
        });

        var replacementClass = this.options.baseClass + '-selection';
        var replacementHtml = '<' + listType + ' class="' + replacementClass + '">' + listElements.join('') + '</' + listType + '>';

        // Selection must be restored before it may be replaced.
        this.editor.restoreSelection();

        var selectedElementParent = $(this.editor.getSelectedElements()[0]).parent();
        var editingElement = this.editor.getElement()[0];

        /*
         * Replace selection if the selected element parent or the selected element is the editing element,
         * instead of splitting the editing element.
         */
        if (selectedElementParent === editingElement
            || this.editor.getSelectedElements()[0] === editingElement) {
            this.editor.replaceSelection(replacementHtml);
        } else {
            this.editor.replaceSelectionWithinValidTags(replacementHtml, this.validParents);
        }

        // Select the first list element of the inserted list
        var selectedElement = $(this.editor.getElement().find('.' + replacementClass).removeClass(replacementClass));
        this.editor.selectInner(selectedElement.find('li:first')[0]);
        this.editor.checkChange();
    },

    /**
     * Determine whether element is inline or block.
     * @see http://stackoverflow.com/a/2881008/187954
     * @param  {string} tag Lower case tag name, e.g. 'a'.
     * @return {string} Default display style for tag.
     */
    getElementDefaultDisplay: function(tag) {
        var cStyle,
            t = document.createElement(tag),
            gcs = "getComputedStyle" in window;

        document.body.appendChild(t);
        cStyle = (gcs ? window.getComputedStyle(t, "") : t.currentStyle).display;
        document.body.removeChild(t);

        return cStyle;
    }
});

$.ui.editor.registerUi({

    /**
     * @name $.editor.ui.listUnordered
     * @augments $.ui.editor.defaultUi
     * @class Wraps the selection with a &lt;ul&gt;, then a &lt;li&gt;
     */
    listUnordered: /** @lends $.editor.ui.listUnordered.prototype */ {


        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            return editor.uiButton({
                title: _('Unordered List'),
                click: function() {
                    editor.getPlugin('list').toggleList('ul');
                }
            });
        }
    },

    /**
     * @name $.editor.ui.listOrdered
     * @augments $.ui.editor.defaultUi
     * @class Wraps the selection with a &lt;ol&gt;, then a &lt;li&gt;
     */
    listOrdered: /** @lends $.editor.ui.listOrdered.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            return editor.uiButton({
                title: _('Ordered List'),
                click: function() {
                    editor.getPlugin('list').toggleList('ol');
                }
            });
        }
    }
});
/**
 * @fileOverview Incredible Raptor logo and usage statistics tracking
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */
$.ui.editor.registerUi({

    /**
     * @name $.editor.ui.logo
     * @augments $.ui.editor.defaultUi
     * @class Displays an <em>amazing</em> Raptor logo, providing your users with both shock and awe.
     * <br/>
     * Links back to the Raptor home page
     */
    logo: /** @lends $.editor.ui.logo.prototype */ {

        ui: null,

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor, options) {
            this.ui = this.editor.uiButton({
                title: _('Learn More About the Raptor WYSIWYG Editor'),
                click: function() {
                    window.open('http://www.jquery-raptor.com/about/editors/', '_blank');
                },

                // Button ready event
                ready: function() {
                    var serializeJSON = function(obj) {
                        var t = typeof(obj);
                        if(t != "object" || obj === null) {
                            // simple data type
                            if(t == "string") obj = '"' + obj + '"';
                            return String(obj);
                        } else {
                            // array or object
                            var json = [], arr = (obj && $.isArray(obj));

                            $.each(obj, function(k, v) {
                                t = typeof(v);
                                if(t == "string") v = '"' + v + '"';
                                else if (t == "object" & v !== null) v = serializeJSON(v);
                                json.push((arr ? "" : '"' + k + '":') + String(v));
                            });

                            return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
                        }
                    };

                    var data = {
                        'enableUi': this.options.enableUi,
                        'enablePlugins': this.options.enablePlugins,
                        'disabledPlugins': serializeJSON(this.options.disabledPlugins),
                        'ui': serializeJSON(this.options.ui),
                        't': new Date().getTime()
                    };

                    var query = [];
                    for (var i in data) {
                        query.push(i + '=' + encodeURIComponent(data[i]));
                    }

                    this.ui.button.find('.ui-button-icon-primary').css({
                        'background-image': 'url(http://www.jquery-raptor.com/logo/0.0.15?' + query.join('&') + ')'
                    });
                }
            });

            return this.ui;
        }
    }
});
/**
 * @name $.editor.plugin.normaliseLineBreaks
 * @augments $.ui.editor.defaultPlugin
 * @class Automaticly wraps content inside an editable element with a specified tag if it is empty.
 */
$.ui.editor.registerPlugin('normaliseLineBreaks', /** @lends $.editor.plugin.normaliseLineBreaks.prototype */ {

    /**
     * @name $.editor.plugin.normaliseLineBreaks.options
     * @type {Object}
     * @namespace Default options
     * @see $.editor.plugin.normaliseLineBreaks
     */
    options: /** @lends $.editor.plugin.normaliseLineBreaks.options */  {

        /**
         * @type {String} The tag to insert when user presses enter
         */
        enter: '<p><br/></p>',

        /**
         * @type {Array} Array of tag names within which the return HTML is valid.
         */
        enterValidTags: [
            'address', 'blockquote', 'body', 'button', 'center', 'dd',
            'div', 'fieldset', 'form', 'iframe', 'li', 'noframes',
            'noscript', 'object', 'td', 'th'
        ],

        /**
         * @type {String} The tag to insert when user presses shift enter.
         */
        shiftEnter: '<br/>',

        /**
         * @type {Array} Array of tag names within which the shiftReturn HTML is valid.
         */
        shiftEnterValidTags: [
            'a', 'abbr', 'acronym', 'address', 'applet', 'b', 'bdo',
            'big', 'blockquote', 'body', 'button', 'caption', 'center',
            'cite', 'code', 'dd', 'del', 'dfn', 'div', 'dt', 'em',
            'fieldset', 'font', 'form', 'h1', 'h2', 'h3', 'h4', 'h5',
            'h6', 'i', 'iframe', 'ins', 'kbd', 'label', 'legend', 'li',
            'noframes', 'noscript', 'object', 'p', 'pres', 'q', 's',
            'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup',
            'td', 'th', 'tt', 'u', 'var'
        ]
    },

    hotkeys: {
        'return': {
            'action': function() {

                selectionDestroy();

                var selectionEmpty = selectionIsEmpty();
                var selectionIsAtStart = selectionAtStartOfElement();
                var selectionIsAtEnd = selectionAtEndOfElement();

                var breakId = this.options.baseClass + '-enter-break';
                var breakElement = $(this.options.enter).attr('id', breakId);

                selectionReplaceWithinValidTags(breakElement, this.options.enterValidTags);

                breakElement = $('#' + breakId).removeAttr('id');
                if (selectionEmpty) {
                    if (selectionIsAtStart) {
                        selectionSelectStart(breakElement.next());
                    } else if(selectionIsAtEnd) {
                        selectionSelectStart(breakElement);
                    } else {
                        selectionSelectStart(breakElement.next());
                        var previousSibling = breakElement.prev();
                        if (previousSibling && !$.trim(previousSibling.html()) == '' && elementOuterHtml(previousSibling) != this.options.enter) {
                            breakElement.remove();
                        }
                    }
                } else {
                    selectionSelectStart(breakElement.next());
                    breakElement.remove();
                }
            },
            restoreSelection: false
        },
        'return+shift': {
            'action': function() {
                selectionDestroy();

                var breakId = this.options.baseClass + '-enter-break';

                var breakElement = $(breakHtml)
                                .attr('id', breakId)
                                .appendTo('body');

                if (this.options.shiftEnterValidTags) {
                    selectionReplaceWithinValidTags(this.options.shiftEnter, this.options.shiftEnterValidTags);
                } else {
                    selectionReplace(breakElement);
                }

                var select = $('#' + breakId).removeAttr('id').next();

                selectionSelectStart(select);
            },
            restoreSelection: false
        }
    }
});
/**
 * @name $.editor.plugin.paste
 * @extends $.editor.plugin
 * @class Plugin that captures paste events on the element and shows a modal dialog containing different versions of what was pasted.
 * Intended to prevent horrible 'paste from word' catastrophes.
 */
$.ui.editor.registerPlugin('paste', /** @lends $.editor.plugin.paste.prototype */ {

    /**
     * @name $.editor.plugin.paste.options
     * @type {Object}
     * @namespace Default options
     * @see $.editor.plugin.paste
     */
    options: /** @lends $.editor.plugin.paste.options */  {

        /**
         * Tags that will not be stripped from pasted content.
         * @type {Array}
         */
        allowedTags: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'ul', 'ol', 'li', 'blockquote',
            'p', 'a', 'span', 'hr', 'br'
        ],

        allowedAttributes: [
            'href', 'title'
        ],

        allowedEmptyTags: [
            'hr', 'br'
        ]
    },

    /**
     * @see $.ui.editor.defaultPlugin#init
     */
    init: function(editor, options) {
        var inProgress = false;
        var dialog = false;
        var selector = '.uiWidgetEditorPasteBin';
        var plugin = this;

        // Event binding
        editor.getElement().bind('paste.' + editor.widgetName, $.proxy(function(event) {
            if (inProgress) return false;
            inProgress = true;

            editor.saveSelection();

            // Make a contentEditable div to capture pasted text
            if ($(selector).length) $(selector).remove();
            $('<div class="uiWidgetEditorPasteBin" contenteditable="true" style="width: 1px; height: 1px; overflow: hidden; position: fixed; top: -1px;" />').appendTo('body');
            $(selector).focus();

            window.setTimeout(function() {
                var markup = $(selector).html();
                markup = plugin.filterAttributes(markup);
                markup = plugin.filterChars(markup);
                markup = plugin.stripEmpty(markup);
                markup = plugin.stripAttributes(markup);
                markup = plugin.editor.stripTags(markup, plugin.options.allowedTags);

                var vars = {
                    plain: $('<div/>').html($(selector).html()).text(),
                    markup: markup,
                    html: $(selector).html()
                };

                dialog = $(editor.getTemplate('paste.dialog', vars));

                dialog.find('.ui-editor-paste-area').bind('keyup.' + editor.widgetname, function(){
                    plugin.updateAreas(this, dialog);
                });

                $(dialog).dialog({
                    modal: true,
                    width: 650,
                    height: 500,
                    resizable: true,
                    title: 'Paste',
                    position: 'center',
                    show: options.dialogShowAnimation,
                    hide: options.dialogHideAnimation,
                    dialogClass: options.baseClass + ' ' + options.dialogClass,
                    buttons:
                        [
                            {
                                text: _('Insert'),
                                click: function() {
                                    var html = null;
                                    var element = $(this).find('.ui-editor-paste-area:visible');

                                    if (element.hasClass('ui-editor-paste-plain') || element.hasClass('ui-editor-paste-source')) {
                                        html = element.val();
                                    } else {
                                        html = element.html();
                                    }

                                    html = plugin.filterAttributes(html);
                                    html = plugin.filterChars(html);

                                    editor.restoreSelection();
                                    editor.replaceSelection(html);

                                    inProgress = false;
                                    $(this).dialog('close');
                                }
                            },
                            {
                                text: _('Cancel'),
                                click: function() {
                                    editor.restoreSelection();
                                    inProgress = false;
                                    $(this).dialog('close');
                                }
                            }
                    ],
                    open: function() {
                        // Create fake jQuery UI tabs (to prevent hash changes)
                        var tabs = $(this).find('.ui-editor-paste-panel-tabs');
                        tabs.find('ul.ui-tabs-nav li').click(function() {
                            tabs.find('ul.ui-tabs-nav li').removeClass('ui-state-active').removeClass('ui-tabs-selected');
                            $(this).addClass('ui-state-active').addClass('ui-tabs-selected');
                            tabs.children('div').hide().eq($(this).index()).show();
                        });

                        // Set custom buttons
                        var buttons = dialog.parent().find('.ui-dialog-buttonpane');
                        buttons.find('button:eq(0)').button({icons: {primary: 'ui-icon-circle-check'}});
                        buttons.find('button:eq(1)').button({icons: {primary: 'ui-icon-circle-close'}});
                    },
                    close: function() {
                        inProgress = false;
                        $(this).dialog('destroy').remove();
                    }
                });

                $(selector).remove();

            }, 0);

            return true;
        }, this));
    },

    /**
     * Attempts to filter rubbish from content using regular expressions
     * @param  {String} content Dirty text
     * @return {String} The filtered content
     */
    filterAttributes: function(content) {
        // The filters variable is an array of of regular expression & handler pairs.
        //
        // The regular expressions attempt to strip out a lot of style data that
        // MS Word likes to insert when pasting into a contentEditable.
        // Almost all of it is junk and not good html.
        //
        // The hander is a place to put a function for match handling.
        // In most cases, it just handles it as empty string.  But the option is there
        // for more complex handling.
        var filters = [
            // Meta tags, link tags, and prefixed tags
            {regexp: /(<meta\s*[^>]*\s*>)|(<\s*link\s* href="file:[^>]*\s*>)|(<\/?\s*\w+:[^>]*\s*>)/gi, handler: ''},
            // MS class tags and comment tags.
            {regexp: /(class="Mso[^"]*")|(<!--(.|\s){1,}?-->)/gi, handler: ''},
            // Apple class tags
            {regexp: /(class="Apple-(style|converted)-[a-z]+\s?[^"]+")/, handle: ''},
            // Google doc attributes
            {regexp: /id="internal-source-marker_[^"]+"|dir="[rtl]{3}"/, handle: ''},
            // blank p tags
            {regexp: /(<p[^>]*>\s*(\&nbsp;|\u00A0)*\s*<\/p[^>]*>)|(<p[^>]*>\s*<font[^>]*>\s*(\&nbsp;|\u00A0)*\s*<\/\s*font\s*>\s<\/p[^>]*>)/ig, handler: ''},
            // Strip out styles containing mso defs and margins, as likely added in IE and are not good to have as it mangles presentation.
            {regexp: /(style="[^"]*mso-[^;][^"]*")|(style="margin:\s*[^;"]*;")/gi, handler: ''},
            // Style tags
            {regexp: /(?:<style([^>]*)>([\s\S]*?)<\/style>|<link\s+(?=[^>]*rel=['"]?stylesheet)([^>]*?href=(['"])([^>]*?)\4[^>\/]*)\/?>)/gi, handler: ''},
            // Scripts (if any)
            {regexp: /(<\s*script[^>]*>((.|\s)*?)<\\?\/\s*script\s*>)|(<\s*script\b([^<>]|\s)*>?)|(<[^>]*=(\s|)*[("|')]javascript:[^$1][(\s|.)]*[$1][^>]*>)/ig, handler: ''}
        ];

        $.each(filters, function(i, filter) {
            content = content.replace(filter.regexp, filter.handler);
        });

        return content;
    },

    /**
     * Replaces commonly-used Windows 1252 encoded chars that do not exist in ASCII or ISO-8859-1 with ISO-8859-1 cognates.
     * @param  {[type]} content [description]
     * @return {[type]}
     */
    filterChars: function(content) {
        var s = content;

        // smart single quotes and apostrophe
        s = s.replace(/[\u2018|\u2019|\u201A]/g, '\'');

        // smart double quotes
        s = s.replace(/[\u201C|\u201D|\u201E]/g, '\"');

        // ellipsis
        s = s.replace(/\u2026/g, '...');

        // dashes
        s = s.replace(/[\u2013|\u2014]/g, '-');

        // circumflex
        s = s.replace(/\u02C6/g, '^');

        // open angle bracket
        s = s.replace(/\u2039/g, '<');

        // close angle bracket
        s = s.replace(/\u203A/g, '>');

        // spaces
        s = s.replace(/[\u02DC|\u00A0]/g, ' ');

        return s;
    },

    /**
     * Strip all attributes from content (if it's an element), and every element contained within
     * Strip loop taken from <a href="http://stackoverflow.com/a/1870487/187954">Remove all attributes</a>
     * @param  {String|Element} content The string / element to be cleaned
     * @return {String} The cleaned string
     */
    stripAttributes: function(content) {
        content = $('<div/>').html(content);
        var allowedAttributes = this.options.allowedAttributes;

        $(content.find('*')).each(function() {
            // First copy the attributes to remove if we don't do this it causes problems iterating over the array
            // we're removing elements from
            var attributes = [];
            $.each(this.attributes, function(index, attribute) {
                // Do not remove allowed attributes
                if (-1 !== $.inArray(attribute.nodeName, allowedAttributes)) {
                    return;
                }
                attributes.push(attribute.nodeName);
            });

            // now remove the attributes
            for (var attributeIndex = 0; attributeIndex < attributes.length; attributeIndex++) {
                $(this).attr(attributes[attributeIndex], null);
            }
        });
        return content.html();
    },

    /**
     * Remove empty tags.
     * @param  {String} content The HTML containing empty elements to be removed
     * @return {String} The cleaned HTML
     */
    stripEmpty: function(content) {
        var wrapper = $('<div/>').html(content);
        var allowedEmptyTags = this.options.allowedEmptyTags;
        wrapper.find('*').filter(function() {
            // Do not strip elements in allowedEmptyTags
            if (-1 !== $.inArray(this.tagName.toLowerCase(), allowedEmptyTags)) {
                return false;
            }
            // If the element has at least one child element that exists in allowedEmptyTags, do not strip it
            if ($(this).find(allowedEmptyTags.join(',')).length) {
                return false;
            }
            return $.trim($(this).text()) === '';
        }).remove();
        return wrapper.html();
    },

    /**
     * Update text input content
     * @param  {Element} target The input being edited
     * @param  {Element} dialog The paste dialog
     */
    updateAreas: function(target, dialog) {

        var synchronize = dialog.find('.ui-editor-paste-synchronize-text input[type="checkbox"]');
        var content = $(target).is('textarea') ? $(target).val() : $(target).html();
        if (synchronize.attr('checked')) {
            if (!$(target).hasClass('ui-editor-paste-plain')) dialog.find('.ui-editor-paste-plain').val($('<div/>').html(content).text());
            if (!$(target).hasClass('ui-editor-paste-rich')) dialog.find('.ui-editor-paste-rich').html(content);
            if (!$(target).hasClass('ui-editor-paste-source')) dialog.find('.ui-editor-paste-source').html(content);
            if (!$(target).hasClass('ui-editor-paste-markup')) dialog.find('.ui-editor-paste-markup').html(this.stripAttributes(content));
        }
    }
});/**
 * @fileOverview Placeholder text component
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

$.ui.editor.registerPlugin('placeholder', /** @lends $.editor.plugin.placeholder.prototype */ {

    /**
     * @see $.ui.editor.defaultPlugin#init
     */
    init: function(editor, options) {
        var plugin = this;

        /**
        * Plugin option defaults
        * @type {Object}
        */
        options = $.extend({}, {
            /**
             * Content to insert into an editable element if said element is empty on initialisation
             * @default Placeholder content
             * @type {String}
             */
            content: '[Your content here]',

            /**
             * Tag to wrap content
             * @default p
             * @type {String}
             */
            tag: 'p',

            /**
             * Select content on insertion
             * @default true
             * @type {Boolean} False to prevent automatic selection of inserted placeholder
             */
            select: true
        }, options);

        /**
         * Show the click to edit message
         */
        this.show = function() {
            if (!$.trim(editor.getElement().html())) {

                var content = $(document.createElement(options.tag)).html(options.content);
                editor.getElement().html(content);

                if (options.select) {
                    editor.selectInner(content);
                }
            }
        };

        editor.bind('show', plugin.show);
    }
});/**
 * @fileOverview Raptorize UI component
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

$.ui.editor.registerUi({

    /**
     * @name $.editor.ui.raptorize
     * @augments $.ui.editor.defaultUi
     * @class Raptorize your editor
     */
    raptorize: /** @lends $.editor.ui.raptorize.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            var ui = editor.uiButton({
                title: _('Raptorize'),
                ready: function() {
                    if (!ui.button.raptorize) {
                        // <strict/>
                        return;
                    }
                    ui.button.raptorize();
                }
            });
            return ui;
        }
    }

});
/**
 * @fileOverview Save plugin & ui component
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */

/**
 * @name $.editor.plugin.saveJson
 * @augments $.ui.editor.defaultPlugin
 * @class Provides an interface for saving the element's content via AJAX. For options see {@link $.editor.plugin.saveJson.options}
 */
$.ui.editor.registerPlugin('saveJson', /** @lends $.editor.plugin.saveJson.prototype */ {

    /**
     * @name $.editor.plugin.saveJson.options
     * @type {Object}
     * @namespace Default options
     * @see $.editor.plugin.saveJson
     */
    options: /** @lends $.editor.plugin.saveJson.options */  {

        /**
         * @type {Object}
         * @default <tt>{ attr: "name" }</tt>
         */
        id: { attr: 'name' },

        /**
         * @type {String}
         * @default "content"
         */
        postName: 'content',

        /**
         * @default false
         * @type {Boolean}
         */
        showResponse: false,

        /**
         * @default false
         * @type {Boolean}
         */
        appendId: false,

        /**
         * @default <tt>{
         *    url: '/',
         *    type: 'post',
         *    cache: false
         * }</tt>
         * @type {Object}
         */
        ajax: {
            url: '/',
            type: 'post',
            cache: false
        }
    },

    /**
     * @see $.ui.editor.defaultPlugin#init
     */
    init: function() {
    },

    /**
     * Get the identifier for this element
     * @return {String} The identifier
     */
    getId: function() {
        if (typeof(this.options.id) === 'string') {
            return this.options.id;
        } else if (typeof(this.options.id) === 'function') {
            return this.options.id.apply(this, [this.editor.getOriginalElement()]);
        } else if (this.options.id.attr) {
            // Check the ID attribute exists on the content block
            var id = this.editor.getOriginalElement().attr(this.options.id.attr);
            if (id) {
                return id;
            }
        }
        return null;
    },

    /**
     * Get the cleaned content for the element.
     * @param {String} id ID to use if no ID can be found.
     * @return {String}
     */
    getData: function() {
        var data = {};
        data[this.getId()] = this.editor.save();
        return data;
    },

    /**
     * Perform save.
     */
    save: function() {
        this.message = this.editor.showLoading(_('Saving changes...'));

        // Get all unified content
        var contentData = {};
        var dirty = 0;
        this.editor.unify(function(editor) {
            if (editor.isDirty()) {
                dirty++;
                var plugin = editor.getPlugin('saveJson');
                $.extend(contentData, plugin.getData());
            }
        });
        this.dirty = dirty;

        // Count the number of requests
        this.saved = 0;
        this.failed = 0;
        this.requests = 0;

        // Pass all content at once
        this.ajax(contentData);
    },

    /**
     * @param {Object} data Data returned from server
     */
    done: function(data) {
        if (this.options.multiple) {
            this.saved++;
        } else {
            this.saved = this.dirty;
        }
        if (this.options.showResponse) {
            this.editor.showConfirm(data, {
                delay: 1000,
                hide: function() {
                    this.editor.unify(function(editor) {
                        editor.disableEditing();
                        editor.hideToolbar();
                    });
                }
            });
        }
    },

    /**
     * Called if a save AJAX request fails
     * @param  {Object} xhr
    */
    fail: function(xhr) {
        if (this.options.multiple) {
            this.failed++;
        } else {
            this.failed = this.dirty;
        }
        if (this.options.showResponse) {
            this.editor.showError(xhr.responseText);
        }
    },

    /**
     * Called after every save AJAX request
     */
    always: function() {
        if (this.dirty === this.saved + this.failed) {
            if (!this.options.showResponse) {
                if (this.failed > 0 && this.saved === 0) {
                    this.editor.showError(_('Failed to save {{failed}} content block(s).', this));
                } else if (this.failed > 0) {
                    this.editor.showError(_('Saved {{saved}} out of {{dirty}} content blocks.', this));
                } else {
                    this.editor.showConfirm(_('Successfully saved {{saved}} content block(s).', this), {
                        delay: 1000,
                        hide: function() {
                            this.editor.unify(function(editor) {
                                editor.disableEditing();
                                editor.hideToolbar();
                            });
                        }
                    });
                }
            }

            // Hide the loading message
            this.message.hide();
            this.message = null;
        }
    },

    /**
     * Handle the save AJAX request(s)
     * @param  {String} contentData The element's content
     * @param  {String} id Editing element's identfier
     */
    ajax: function(contentData, id) {

        // Create the JSON request
        var ajax = $.extend(true, {}, this.options.ajax);

        if ($.isFunction(ajax.data)) {
            ajax.data = ajax.data.apply(this, [id, contentData]);
        } else if (this.options.postName) {
            ajax.data = {};
            ajax.data[this.options.postName] = JSON.stringify(contentData);
        }

        // Get the URL, if it is a callback
        if ($.isFunction(ajax.url)) {
            ajax.url = ajax.url.apply(this, [id]);
        }

        // Send the data to the server
        this.requests++;
        $.ajax(ajax)
            .done($.proxy(this.done, this))
            .fail($.proxy(this.fail, this))
            .always($.proxy(this.always, this));
    }

});
/**
 * @fileOverview
 * @author David Neilsen david@panmedia.co.nz
 */

/**
 * @name $.editor.plugin.saverest
 * @augments $.ui.editor.defaultPlugin
 * @class
 */
$.ui.editor.registerPlugin('saveRest', /** @lends $.editor.plugin.saveRest.prototype */ {

    /**
     * @name $.editor.plugin.saveRest.options
     * @type {Object}
     * @namespace Default options
     * @see $.editor.plugin.saveRest
     */
    options: /** @lends $.editor.plugin.saveRest.options */  {

        /**
         * @default false
         * @type {Boolean}
         */
        showResponse: false,

        /**
         * @default <tt>{
         *    url: '/',
         *    type: 'post',
         *    cache: false
         * }</tt>
         * @type {Object}
         */
        ajax: {
            url: '/',
            type: 'post',
            cache: false
        }
    },

    /**
     * @see $.ui.editor.defaultPlugin#init
     */
    init: function() {
    },

    /**
     * Get the identifier for this element
     * @return {String} The identifier
     */
    getId: function() {
        if (typeof(this.options.id) === 'string') {
            return this.options.id;
        } else if (this.options.id.attr) {
            // Check the ID attribute exists on the content block
            var id = this.editor.getOriginalElement().attr(this.options.id.attr);
            if (id) {
                return id;
            }
        }
        return null;
    },

    /**
     * Get the cleaned content for the element.
     * @param {String} id ID to use if no ID can be found.
     * @return {String}
     */
    getData: function(id) {
        var data = {};
        data[this.getId() || id] = this.editor.save();
        return this.editor.save();
    },

    /**
     * Perform save.
     */
    save: function() {
        this.message = this.editor.showLoading(_('Saving changes...'));

        // Count the number of requests
        this.saved = 0;
        this.failed = 0;
        this.requests = 0;

        // Get all unified content
        var dirty = 0;
        this.editor.unify(function(editor) {
            if (editor.isDirty()) {
                dirty++;
                var plugin = editor.getPlugin('saveRest');
                var content = plugin.editor.save();
                plugin.ajax(content);
            }
        });
        this.dirty = dirty;

        if (dirty === 0) {
            this.message.hide();
            this.editor.showInfo(_('No changes detected to save...'));
        }
    },

    /**
     * @param {Object} data Data returned from server
     */
    done: function(data) {
        if (this.options.multiple) {
            this.saved++;
        } else {
            this.saved = this.dirty;
        }
        if (this.options.showResponse) {
            this.editor.showConfirm(data, {
                delay: 1000,
                hide: function() {
                    this.editor.unify(function(editor) {
                        editor.disableEditing();
                        editor.hideToolbar();
                    });
                }
            });
        }
    },

    /**
     * Called if a save AJAX request fails
     * @param  {Object} xhr
    */
    fail: function(xhr) {
        if (this.options.multiple) {
            this.failed++;
        } else {
            this.failed = this.dirty;
        }
        if (this.options.showResponse) {
            this.editor.showError(xhr.responseText);
        }
    },

    /**
     * Called after every save AJAX request
     */
    always: function() {
        if (this.dirty === this.saved + this.failed) {
            if (!this.options.showResponse) {
                if (this.failed > 0 && this.saved === 0) {
                    this.editor.showError(_('Failed to save {{failed}} content block(s).', this));
                } else if (this.failed > 0) {
                    this.editor.showError(_('Saved {{saved}} out of {{dirty}} content blocks.', this));
                } else {
                    this.editor.showConfirm(_('Successfully saved {{saved}} content block(s).', this), {
                        delay: 1000,
                        hide: function() {
                            this.editor.unify(function(editor) {
                                editor.disableEditing();
                                editor.hideToolbar();
                            });
                        }
                    });
                }
            }

            // Hide the loading message
            this.message.hide();
            this.message = null;
        }
    },

    /**
     * Handle the save AJAX request(s)
     * @param  {String} contentData The element's content
     * @param  {String} id Editing element's identfier
     */
    ajax: function(contentData, id) {
        // Create POST data
        //var data = {};

        // Content is serialized to a JSON object, and sent as 1 post parameter
        //data[this.options.postName] = JSON.stringify(contentData);

        // Create the JSON request
        var ajax = $.extend(true, {}, this.options.ajax);

        if ($.isFunction(ajax.data)) {
            ajax.data = ajax.data.apply(this, [id, contentData]);
        } else if (this.options.postName) {
            ajax.data = {};
            ajax.data[this.options.postName] = JSON.stringify(contentData);
        }

        // Get the URL, if it is a callback
        if ($.isFunction(ajax.url)) {
            ajax.url = ajax.url.apply(this, [id]);
        }

        // Send the data to the server
        this.requests++;
        $.ajax(ajax)
            .done($.proxy(this.done, this))
            .fail($.proxy(this.fail, this))
            .always($.proxy(this.always, this));
    }

});
/**
 * @fileOverview
 * @author David Neilsen david@panmedia.co.nz
 */

/**
 * @name $.editor.ui.save
 * @augments $.ui.editor.defaultUi
     * @class The save UI component
 */
$.ui.editor.registerUi('save', /** @lends $.editor.ui.hr.prototype */ {

    options: {
        plugin: 'saveJson'
    },

    /**
     * @see $.ui.editor.defaultUi#init
     */
    init: function(editor, element) {
        return editor.uiButton({
            title: _('Save'),
            icon: 'ui-icon-save',
            click: function() {
                editor.checkChange();
                editor.getPlugin(this.options.plugin).save();
            }
        });
    }
});
$.ui.editor.registerPlugin({
    snippet: {
        ids: [],
        enabled: false,

        init: function(editor, options) {
            if (options.snippets) {
                for (var i = 0, l = options.snippets.length; i < l; i++) {
                    this.createSnippet(options.snippets[i], editor);
                }

                editor.bind('restore', this.createButtons, this);
                editor.bind('save', this.disable, this);
                editor.bind('cancel', this.disable, this);

                editor.bind('enabled', this.enable, this);
                editor.bind('disabled', this.disable, this);

            }
        },

        createSnippet: function(snippet, editor) {
//            $.ui.editor.registerUi('snippet' + snippet.name.charAt(0).toUpperCase() + snippet.name.substr(1), {
//                init: function(editor, options) {
//                    return editor.uiButton({
//                        name: 'snippet',
//                        title: _('Insert Snippet')
//                    });
//                }
//            });
        },

        enable: function() {
            this.enabled = true;
            this.createButtons();
        },

        disable: function() {
            this.removeButtons();
            this.enabled = false;
        },

        createButtons: function() {
            var editor = this.editor;

            for (var i = 0, l = this.options.snippets.length; i < l; i++) {
                var snippet = this.options.snippets[i];
                if (snippet.repeatable) {
                    this.createButton(snippet, editor);
                }
            }
        },

        createButton: function(snippet, editor) {
            if (!this.enabled) {
                return;
            }
            var plugin = this;
            var id = editor.getUniqueId();
            this.ids.push(id);

            var button = $('<button/>')
                .addClass(plugin.options.baseClass)
                .addClass(plugin.options.baseClass + '-button')
                .addClass(plugin.options.baseClass + '-button-' + snippet.name)
                .addClass(id)
                .text('Add')
                .click(function() {
                    plugin.insertSnippet.call(plugin, snippet, editor, this);
                });

            var buttonAfter = (snippet.buttonAfter || editor.getElement());
            if ($.isFunction(buttonAfter)) {
                buttonAfter.call(this, button, snippet);
            } else {
                button.insertAfter(buttonAfter);
            }

            $('.' + id)
                .button({
                    icons: { primary: 'ui-icon-plusthick' }
                });
        },

        removeButtons: function() {
            if (!this.enabled) {
                return;
            }
            // Remove the button by the ID
            for (var i = 0, l = this.ids.length; i < l; i++) {
                $('.' + this.ids[i]).remove();
            }
            // Run clean function (if supplied)
            for (i = 0, l = this.options.snippets.length; i < l; i++) {
                var snippet = this.options.snippets[i];
                if ($.isFunction(snippet.clean)) {
                    snippet.clean.call(snippet, this, this.editor);
                }
            }
        },

        insertSnippet: function(snippet, editor, button) {
            var template = $(snippet.template).html();

            var appendTo = snippet.appendTo || editor.getElement();
            if ($.isFunction(appendTo)) {
                appendTo.call(this, template, snippet, button);
            } else {
                $(template).appendTo(appendTo);
            }

            editor.disableEditing();
            editor.enableEditing();
        }

    }
});
/**
 * @fileOverview UI Component for a tag-change select menu
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */
$.ui.editor.registerUi({

    /**
     * @name $.editor.plugin.tagMenu
     * @augments $.ui.editor.defaultPlugin
     * @class Select menu allowing users to change the tag for selection
     */
    tagMenu: /** @lends $.editor.plugin.tagMenu.prototype */ {

        validParents: [
            'blockquote', 'body', 'button', 'center', 'dd', 'div', 'fieldset', 'form', 'iframe', 'li',
            'noframes', 'noscript', 'object', 'td', 'th'
        ],

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor) {
            editor.bind('selectionChange', this.change, this);
            editor.bind('show', this.change, this);

            var ui = this;

            return editor.uiSelectMenu({
                name: 'tagMenu',
                title: _('Change HTML tag of selected element'),
                select: $(editor.getTemplate('tagmenu.menu')),
                change: function(value) {
                    // Prevent injection of illegal tags
                    if (typeof value === 'undefined' || value === 'na') {
                        return;
                    }

                    var editingElement = editor.getElement()[0];
                    var selectedElement = editor.getSelectedElements();
                    if (!editor.getSelectedHtml() || editor.getSelectedHtml() === '') {
                        // Do not attempt to modify editing element's tag
                        if ($(selectedElement)[0] === $(editingElement)[0]) {
                            return;
                        }
                        editor.saveSelection();
                        var replacementElement = $('<' + value + '>').html(selectedElement.html());
                        selectedElement.replaceWith(replacementElement);
                        editor.restoreSelection();
                    } else {
                        var selectedElementParent = $(editor.getSelectedElements()[0]).parent();
                        var temporaryClass = this.options.baseClass + '-selection';
                        var replacementHtml = $('<' + value + '>').html(editor.getSelectedHtml()).addClass(temporaryClass);

                        /*
                         * Replace selection if the selected element parent or the selected element is the editing element,
                         * instead of splitting the editing element.
                         */
                        if (selectedElementParent === editingElement
                            || editor.getSelectedElements()[0] === editingElement) {
                            editor.replaceSelection(replacementHtml);
                        } else {
                            editor.replaceSelectionWithinValidTags(replacementHtml, this.validParents);
                        }

                        editor.selectInner(editor.getElement().find('.' + temporaryClass).removeClass(temporaryClass));
                    }

                    editor.checkChange();
                }
            });
        },

        /**
         * Content changed event
         */
        change: function() {
            var tag = this.editor.getSelectedElements()[0];
            if (!tag) {
                $(this.ui.button).toggleClass('ui-state-disabled', true);
                return;
            }
            tag = tag.tagName.toLowerCase();
            if (this.ui.select.find('option[value=' + tag + ']').length) {
                this.ui.val(tag);
            } else {
                this.ui.val('na');
            }
            $(this.ui.button).toggleClass('ui-state-disabled', this.editor.getElement()[0] === this.editor.getSelectedElements()[0]);
        }
    }
});
/**
 * @fileOverview Toolbar tips plugin
 * @author David Neilsen david@panmedia.co.nz
 */

/**
 * @name $.editor.plugin.toolbarTip
 * @augments $.ui.editor.defaultPlugin
 * @class Converts native tool tips to styled tool tips
 */
$.ui.editor.registerPlugin('toolbarTip', /** @lends $.editor.plugin.toolbarTip.prototype */ {

    /**
     * @see $.ui.editor.defaultPlugin#init
     */
    init: function(editor, options) {
        if ($.browser.msie) {
            return;
        }
        this.bind('show, tagTreeUpdated', function() {
            $('.ui-editor-wrapper [title]').each(function() {
                $(this).attr('data-title', $(this).attr('title'));
                $(this).removeAttr('title');
            });
        });
    }

});/**
 * @fileOverview UI Component for displaying a warning in a corner of the element when unsaved edits exist
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */
(function() {
    /**
     * The warning message node.
     * @type Element
     */
    var warning = null;

    /**
     * Amount of dirty blocks.
     * @type Element
     */
    var dirty = 0;

    /**
     * @name $.editor.plugin.unsavedEditWarning
     * @augments $.ui.editor.defaultPlugin
     * @see $.editor.plugin.unsavedEditWarning.options
     * @class
     */
    $.ui.editor.registerPlugin('unsavedEditWarning', /** @lends $.editor.plugin.unsavedEditWarning.prototype */ {

        /**
         * @see $.ui.editor.defaultPlugin#init
         */
        init: function(editor, options) {
            var plugin = this;

            if (!warning) {
                warning = $(editor.getTemplate('unsavededitwarning.warning', this.options))
                    .attr('id', editor.getUniqueId())
                    .appendTo('body')
                    .bind('mouseenter.' + editor.widgetName, function() {
                        $.ui.editor.eachInstance(function(editor) {
                            if (editor.isDirty()) {
                                editor.getElement().addClass(plugin.options.baseClass + '-dirty');
                            }
                        });
                    })
                    .bind('mouseleave.' + editor.widgetName, function() {
                        $('.' + plugin.options.baseClass + '-dirty').removeClass(plugin.options.baseClass + '-dirty');
                    });
            }

            editor.bind('dirty', function() {
                dirty++;
                if (dirty > 0) {
                    elementBringToTop(warning);
                    warning.addClass(plugin.options.baseClass + '-visible');
                }
            });

            editor.bind('cleaned', function() {
                dirty--;
                if (dirty === 0) {
                    warning.removeClass(plugin.options.baseClass + '-visible');
                }
            });
        }

    });

})();/**
 * @fileOverview View source UI component
 * @author David Neilsen david@panmedia.co.nz
 * @author Michael Robinson michael@panmedia.co.nz
 */
 $.ui.editor.registerUi({

    /**
     * @name $.editor.ui.viewSource
     * @augments $.ui.editor.defaultUi
     * @class Shows a dialog containing the element's markup, allowing the user to edit the source directly
     */
    viewSource: /** @lends $.editor.ui.viewSource.prototype */ {

        /**
         * @see $.ui.editor.defaultUi#init
         */
        init: function(editor, options) {
//            editor.bind('hide', this.hide, this);

            return editor.uiButton({
                title: _('View / Edit Source'),
                click: function() {
                    this.show();
                }
            });
        },

        /**
         * Show the view source dialog. Disable the button.
         */
        show: function() {
            var ui = this;

            var dialog = $(this.editor.getTemplate('viewsource.dialog', {
                baseClass: ui.options.baseClass,
                source: ui.editor.getHtml()
            }));

            var button = this.ui.button;
            $(button).button('option', 'disabled', true);

            dialog.dialog({
                modal: false,
                width: 600,
                height: 400,
                resizable: true,
                title: _('View Source'),
                autoOpen: true,
                dialogClass: ui.options.baseClass + ' ' + ui.options.dialogClass,
                buttons: [
                    {
                        text: _('Apply Source'),
                        click: function() {
                            var html = $(this).find('textarea').val();
                            ui.editor.setHtml(html);
                            $(this).find('textarea').val(ui.editor.getHtml());
                        }
                    },
                    {
                        text: _('Close'),
                        click: function() {
                            $(this).dialog('close');
                        }
                    }
                ],
                open: function() {
                    var buttons = $(this).parent().find('.ui-dialog-buttonpane');
                    buttons.find('button:eq(0)').button({ icons: { primary: 'ui-icon-circle-check' }});
                    buttons.find('button:eq(1)').button({ icons: { primary: 'ui-icon-circle-close' }});
                },
                close: function() {
                    $(this).dialog('destroy').remove();
                    $(button).button('option', 'disabled', false);
                    ui.editor.checkChange();
                }
            });
        }
    }
});raptor.registerPreset('toolbar', {
    layout: {
        type: 'toolbar',
        options: {
            uiOrder: null
        }
    }
});

$.extend(raptor.defaults, raptor.presets.toolbar);
var raptor = /** @lends $.ui.editor */ {

    /**
     * Default options for Raptor.
     *
     * @namespace Default options for Raptor.
     */
    defaults: {
        /**
         * @type Object Default layout to use.
         */
        layout: null,

        /**
         * Plugins option overrides.
         *
         * @type Object
         */
        plugins: {},

        /**
         * UI option overrides.
         *
         * @type Object
         */
        ui: {},

        /**
         * Default events to bind.
         *
         * @type Object
         */
        bind: {},

        /**
         *
         * @type Object
         */
        domTools: domTools,

        /**
         * Namespace used for persistence to prevent conflicting with other stored values.
         *
         * @type String
         */
        namespace: null,

        /**
         * Switch to indicated that some events should be automatically applied to all editors that are 'unified'
         * @type boolean
         */
        unify: true,

        /**
         * Switch to indicate weather or not to stored persistent values, if set to false the persist function will always return null
         * @type boolean
         */
        persistence: true,

        /**
         * The name to store persistent values under
         * @type String
         */
        persistenceName: 'uiEditor',

        /**
         * Switch to indicate weather or not to a warning should pop up when the user navigates aways from the page and there are unsaved changes
         * @type boolean
         */
        unloadWarning: true,

        /**
         * Switch to automatically enabled editing on the element
         * @type boolean
         */
        autoEnable: false,

        /**
         * Only enable editing on certian parts of the element
         * @type {jQuerySelector}
         */
        partialEdit: false,

        /**
         * Switch to specify if the editor should automatically enable all plugins, if set to false, only the plugins specified in the 'plugins' option object will be enabled
         * @type boolean
         */
        enablePlugins: true,

        /**
         * An array of explicitly disabled plugins
         * @type String[]
         */
        disabledPlugins: [],

        /**
         * And array of arrays denoting the order and grouping of UI elements in the toolbar
         * @type String[]
         */
        uiOrder: null,

        /**
         * Switch to specify if the editor should automatically enable all UI, if set to false, only the UI specified in the {@link $.ui.editor.defaults.ui} option object will be enabled
         * @type boolean
         */
        enableUi: true,

        /**
         * An array of explicitly disabled UI elements
         * @type String[]
         */
        disabledUi: [],

        /**
         * Default message options
         * @type Object
         */
        message: {
            delay: 5000
        },

        /**
         * Switch to indicate that the element the editor is being applied to should be replaced with a div (useful for textareas), the value/html of the replaced element will be automatically updated when the editor element is changed
         * @type boolean
         */
        replace: false,

        /**
         * A list of styles that will be copied from the replaced element and applied to the editor replacement element
         * @type String[]
         */
        replaceStyle: [
            'display', 'position', 'float', 'width',
            'padding-left', 'padding-right', 'padding-top', 'padding-bottom',
            'margin-left', 'margin-right', 'margin-top', 'margin-bottom'
        ],

        /**
         *
         * @type String
         */
        baseClass: 'ui-editor',

        /**
         * CSS class prefix that is prepended to inserted elements classes. E.g. "cms-bold"
         * @type String
         */
        cssPrefix: 'cms-',

        draggable: true
    },

    /**
     * Events added via $.ui.editor.bind
     * @property {Object} events
     */
    events: {},

    /**
     * Plugins added via $.ui.editor.registerPlugin
     * @property {Object} plugins
     */
    plugins: {},

    /**
     * UI added via $.ui.editor.registerUi
     * @property {Object} ui
     */
    ui: {},

    /**
     * Layouts added via $.ui.editor.registerLayout
     * @property {Object} layouts
     */
    layouts: {},

    /**
     * Presets added via $.ui.editor.registerPreset
     * @property {Object} presets
     */
    presets: {},

    /**
     * @property {$.ui.editor[]} instances
     */
    instances: [],

    /**
     * @returns {$.ui.editor[]}
     */
    getInstances: function() {
        return this.instances;
    },

    eachInstance: function(callback) {
        for (var i = 0; i < this.instances.length; i++) {
            callback.call(this.instances[i], this.instances[i]);
        }
    },

    /*========================================================================*\
     * Templates
    \*========================================================================*/
    /**
     * @property {String} urlPrefix
     */
    urlPrefix: '/jquery-raptor/',

    /**
     * @property {Object} templates
     */
    templates: { /* <templates/> */ },

    /**
     * @param {String} name
     * @returns {String}
     */
    getTemplate: function(name, urlPrefix) {
        var template;
        if (!this.templates[name]) {
            // Parse the URL
            var url = urlPrefix || this.urlPrefix;
            var split = name.split('.');
            if (split.length === 1) {
                // URL is for and editor core template
                url += 'templates/' + split[0] + '.html';
            } else {
                // URL is for a plugin template
                url += 'plugins/' + split[0] + '/templates/' + split.splice(1).join('/') + '.html';
            }

            // Request the template
            $.ajax({
                url: url,
                type: 'GET',
                async: false,
                // <debug/>
                // 15 seconds
                timeout: 15000,
                error: function() {
                    template = null;
                },
                success: function(data) {
                    template = data;
                }
            });
            // Cache the template
            this.templates[name] = template;
        } else {
            template = this.templates[name];
        }
        return template;
    },

    /*========================================================================*\
     * Helpers
    \*========================================================================*/
    /**
     * @returns {String}
     */
    getUniqueId: function() {
        var id = $.ui.editor.defaults.baseClass + '-uid-' + new Date().getTime() + '-' + Math.floor(Math.random() * 100000);
        while ($('#' + id).length) {
            id = $.ui.editor.defaults.baseClass + '-uid-' + new Date().getTime() + '-' + Math.floor(Math.random() * 100000);
        }
        return id;
    },

    /**
     * @returns {boolean}
     */
    isDirty: function() {
        var instances = this.getInstances();
        for (var i = 0; i < instances.length; i++) {
            if (instances[i].isDirty()) return true;
        }
        return false;
    },

    /**
     *
     */
    unloadWarning: function() {
        var instances = this.getInstances();
        for (var i = 0; i < instances.length; i++) {
            if (instances[i].isDirty() &&
                    instances[i].isEditing() &&
                    instances[i].options.unloadWarning) {
                return _('\nThere are unsaved changes on this page. \nIf you navigate away from this page you will lose your unsaved changes');
            }
        }
    },

    /*========================================================================*\
     * Plugins as UI
    \*========================================================================*/

    /**
     * @name $.ui.editor.defaultUi
     * @class The default UI component
     * @property {Object} defaultUi
     */
    defaultUi: /** @lends $.ui.editor.defaultUi.prototype */ {
        ui: null,

        /**
         * The {@link $.ui.editor} instance
         * @type {Object}
         */
        editor: null,

        /**
         * @type {Object}
         */
        options: null,

        /**
         * Initialise & return an instance of this UI component
         * @param  {$.editor} editor  The editor instance
         * @param  {$.ui.editor.defaults} options The default editor options extended with any overrides set at initialisation
         * @return {Object} An instance of the ui component
         */
        init: function(editor, options) {},

        /**
         * @param  {String} key   The key
         * @param  {[String|Object|int|float]} value A value to be stored
         * @return {String|Object|int|float} The stored value
         */
        persist: function(key, value) {
            return this.editor.persist(key, value);
        },

        /**
         * @param  {String}   name
         * @param  {Function} callback
         * @param  {String}   context
         */
        bind: function(name, callback, context) {
            this.editor.bind(name, callback, context || this);
        },

        /**
         * @param  {String}   name
         * @param  {Function} callback
         * @param  {Object}   context
         */
        unbind: function(name, callback, context) {
            this.editor.unbind(name, callback, context || this);
        }
    },

    /**
     * Registers a new UI component, overriding any previous UI components registered with the same name.
     *
     * @param {String} name
     * @param {Object} ui
     */
    registerUi: function(name, ui) {
        // <strict/>
        this.ui[name] = $.extend({}, this.defaultUi, ui);
    },

    /**
     * Registers a new layout, overriding any previous layout registered with the same name.
     *
     * @param {String} name
     * @param {Object} layout
     */
    registerLayout: function(name, layout) {
        // <strict/>
        this.layouts[name] = layout;
    },

    /**
     * Registers a new preset, overriding any previous preset registered with the same name.
     *
     * @param {String} name
     * @param {Object} preset
     */
    registerPreset: function(name, preset) {
        // <strict/>
        this.presets[name] = preset;
    },

    /**
     * @name $.ui.editor.defaultPlugin
     * @class The default plugin
     * @property {Object} defaultPlugin
     */
    defaultPlugin: /** @lends $.ui.editor.defaultPlugin.prototype */ {

        /**
         * The {@link $.ui.editor} instance
         * @type {Object}
         */
        editor: null,

        /**
         * @type {Object}
         */
        options: null,

        /**
         * Initialise & return an instance of this plugin
         * @param  {$.editor} editor  The editor instance
         * @param  {$.ui.editor.defaults} options The default editor options extended with any overrides set at initialisation
         * @return {Object} An instance of the ui component
         */
        init: function(editor, options) {},

        /**
         * @param  {String} key   The key
         * @param  {[String|Object|int|float]} value A value to be stored
         * @return {String|Object|int|float} The stored value
         */
        persist: function(key, value) {
            return this.editor.persist(key, value);
        },

        /**
         * @param  {String}   name
         * @param  {Function} callback
         * @param  {String}   context
         */
        bind: function(name, callback, context) {
            this.editor.bind(name, callback, context || this);
        },

        /**
         * @param  {String}   name
         * @param  {Function} callback
         * @param  {Object}   context
         */
        unbind: function(name, callback, context) {
            this.editor.unbind(name, callback, context || this);
        }
    },

    /**
     *
     * @param {Object|String} mixed
     * @param {Object} [plugin]
     */
    registerPlugin: function(mixed, plugin) {
        // Allow array objects, and single plugins
        if (typeof(mixed) === 'string') {
            // <strict/>

            this.plugins[mixed] = $.extend({}, this.defaultPlugin, plugin);
        } else {
            for (var name in mixed) {
                this.registerPlugin(name, mixed[name]);
            }
        }
    },

    /*========================================================================*\
     * Events
    \*========================================================================*/

    /**
     * @param {String} name
     * @param {function} callback
     */
    bind: function(name, callback) {
        if (!this.events[name]) this.events[name] = [];
        this.events[name].push(callback);
    },

    /**
     * @param {function} callback
     */
    unbind: function(callback) {
        $.each(this.events, function(name) {
            for (var i = 0; i < this.length; i++) {
                if (this[i] === callback) {
                    this.events[name].splice(i,1);
                }
            }
        });
    },

    /**
     * @param {String} name
     */
    fire: function(name) {
        // <debug/>
        if (!this.events[name]) return;
        for (var i = 0, l = this.events[name].length; i < l; i++) {
            this.events[name][i].call(this);
        }
    },

    /*========================================================================*\
     * Persistance
    \*========================================================================*/
    /**
     * @param {String} key
     * @param {mixed} value
     * @param {String} namespace
     */
    persist: function(key, value, namespace) {
        key = namespace ? namespace + '.' + key : key;
        if (localStorage) {
            var storage;
            if (localStorage.uiWidgetEditor) {
                storage = JSON.parse(localStorage.uiWidgetEditor);
            } else {
                storage = {};
            }
            if (value === undefined) return storage[key];
            storage[key] = value;
            localStorage.uiWidgetEditor = JSON.stringify(storage);
        }

        return value;
    }
};
/**
 * @fileOverview
 * @author David Neilsen - david@panmedia.co.nz
 * @author Michael Robinson - michael@panmedia.co.nz
 * @version 0.1
 */

/**
 * Remove comments from element.
 *
 * @param  {jQuery} parent The jQuery element to have comments removed from.
 * @return {jQuery} The modified parent.
 */
function elementRemoveComments(parent) {
    parent.contents().each(function() {
        if (this.nodeType == 8) {
            $(this).remove()
        }
    });
    parent.children().each(function() {
        element.removeComments($(this));
    });
    return parent;
}

/**
 * Remove all but the allowed attributes from the parent.
 *
 * @param {jQuery} parent The jQuery element to cleanse of attributes.
 * @param {String[]|null} allowedAttributes An array of allowed attributes.
 * @return {jQuery} The modified parent.
 */
function elementRemoveAttributes(parent, allowedAttributes) {
    parent.children().each(function() {
        var stripAttributes = $.map(this.attributes, function(item) {
            if ($.inArray(item.name, allowedAttributes) === -1) {
                return item.name;
            }
        });
        var child = $(this);
        $.each(stripAttributes, function(i, attributeName) {
            child.removeAttr(attributeName);
        });
        element.removeAttributes($(this), allowedAttributes);
    });
    return parent;
}

/**
 * Sets the z-index CSS property on an element to 1 above all its sibling elements.
 *
 * @param {jQuery} element The jQuery element to cleanse of attributes.
 */
function elementBringToTop(element) {
    var zIndex = 1;
    element.siblings().each(function() {
        var z = $(this).css('z-index');
        if (!isNaN(z) && z > zIndex) {
            zIndex = z + 1;
        }
    });
    element.css('z-index', zIndex);
}

/**
 * @param  {jQuery} element The jQuery element to retrieve the outer HTML from.
 * @return {String} The outer HTML.
 */
function elementOuterHtml(element) {
    return element.clone().wrap('<div/>').parent().html();
}

/**
 * @param  {jQuery} element The jQuery element to retrieve the outer text from.
 * @return {String} The outer text.
 */
function elementOuterText(element) {
    return element.clone().wrap('<div/>').parent().text();
}
/**
 * @fileOverview
 * @author David Neilsen david@panmedia.co.nz
 * @version 0.1
 */

/**
 * Convert a DOMFragment to an HTML string. Optinally wraps the tring in a tag.
 *
 */
function fragmentToHtml(domFragment, tag) {
    var html = '';
    // Get all nodes in the extracted content
    for (var j = 0, l = domFragment.childNodes.length; j < l; j++) {
        var node = domFragment.childNodes.item(j);
        var content = node.nodeType === 3 ? node.nodeValue : elementOuterHtml($(node));
        if (content) {
            html += content;
        }
    }
    if (tag) {
        html = $('<' + tag + '>' + html + '</' + tag + '>');
        html.find('p').wrapInner('<' + tag + '/>');
        html.find('p > *').unwrap();
        html = $('<div/>').html(html).html();
    }
    return html;
}
/**
 * @fileOverview
 * @author David Neilsen david@panmedia.co.nz
 * @version 0.1
 */

/**
 * Expands a range to to surround all of the content from its start container
 * to its end container.
 *
 * @public @static
 * @param {RangyRange} range The range to expand
 */
function rangeExpandToParent(range) {
    range.setStartBefore(range.startContainer);
    range.setEndAfter(range.endContainer);
}

function rangeExpandTo(range, elements) {
    do {
        rangeExpandToParent(range);
        console.log(range.commonAncestorContainer);
        for (var i = 0, l = elements.length; i < l; i++) {
            if ($(range.commonAncestorContainer).is(elements[i])) {
                return;
            }
        }
    } while (range.commonAncestorContainer)
}

//function rangeIsWholeElement(range) {
//    return range.toString() ==
//}
/**
 * @fileOverview
 * @author David Neilsen david@panmedia.co.nz
 * @version 0.1
 */

/**
 * Iterates over all ranges in a selection and calls the callback for each
 * range. The selection/range offsets is updated in every iteration in in the
 * case that a range was changed or removed by a previous iteration.
 *
 * @public @static
 * @param {function} callback The function to call for each range. The first and only parameter will be the current range.
 * @param {RangySelection} [selection] A RangySelection, or by default, the current selection.
 * @param {object} [context] The context in which to call the callback.
 */
function selectionEachRange(callback, selection, context) {
    selection = selection || rangy.getSelection();
    var range, i = 0;
    // Create a new range set every time to update range offsets
    while (range = selection.getAllRanges()[i++]) {
        callback.call(context, range);
    }
}

function selectionSet(mixed) {
    rangy.getSelection().setSingleRange(mixed);
}
/**
 * @fileOverview String helper functions
 * @author David Neilsen - david@panmedia.co.nz
 * @author Michael Robinson - michael@panmedia.co.nz
 */

/**
 * Modification of strip_tags from PHP JS - http://phpjs.org/functions/strip_tags:535.
 * @param  {string} content HTML containing tags to be stripped
 * @param {Array} allowedTags Array of tags that should not be stripped
 * @return {string} HTML with all tags not present allowedTags array.
 */
function stringStripTags(content, allowedTags) {
    // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    allowed = [];
    for (var allowedTagsIndex = 0; allowedTagsIndex < allowedTags.length; allowedTagsIndex++) {
        if (allowedTags[allowedTagsIndex].match(/[a-z][a-z0-9]{0,}/g)) {
            allowed.push(allowedTags[allowedTagsIndex]);
        }
    }
    // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*\/?>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;

    return content.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
        return allowed.indexOf($1.toLowerCase()) > -1 ? $0 : '';
    });
}function Button() {
    return {
        init: function() {
            this.ui = $('<div/>')
                .text('Button')
                .button();
        }
    };
};
function Menu() {
    return {
        init: function() {
            this.ui = $('<div/>')
                .text('Menu')
                .button();
        }
    };
};
function Menu() {
    return {
        init: function() {
            this.ui = $('<div/>')
                .text('Menu')
                .button();
        }
    };
};

raptor.registerLayout('toolbar', {
    options: {
        /**
         * Each element of the uiOrder should be an array of UI which will be grouped.
         */
        uiOrder: null
    },

    init: function(editor, options) {
        // Load all UI components if not supplied
        if (!options.uiOrder) {
            options.uiOrder = [];
            for (var name in raptor.ui) {
                options.uiOrder.push([name]);
            }
        }

        // <debug/>

        var toolbar = this.toolbar = $('<div/>')
            .addClass(this.options.baseClass + '-toolbar');
        var toolbarWrapper = this.toolbarWrapper = $('<div/>')
            .addClass(this.options.baseClass + '-toolbar-wrapper')
            .addClass('ui-widget-content')
            .append(toolbar);
        var path = this.path = $('<div/>')
            .addClass(this.options.baseClass + '-path')
            .addClass('ui-widget-header')
            .html(editor.getTemplate('root'));
        var wrapper = this.wrapper = $('<div/>')
            .addClass(this.options.baseClass + '-wrapper')
            .css('display', 'none')
            .append(path)
            .append(toolbarWrapper);

        if ($.fn.draggable && this.options.draggable) {
            // <debug/>

            wrapper.draggable({
                cancel: 'a, button',
                cursor: 'move',
                // @todo Cancel drag when docked
                // @todo Move draggable into plugin
                // @todo Move tag menu/list into plugin
                handle: '.ui-editor-path',
                stop: $.proxy(function() {
                    // Save the persistant position
                    var pos = editor.persist('position', [
                        wrapper.css('top'),
                        wrapper.css('left')
                    ]);
                    wrapper.css({
                        top: Math.abs(pos[0]),
                        left: Math.abs(pos[1])
                    });

                    // <debug/>
                }, this)
            });

            // Remove the relative position
            wrapper.css('position', '');

            // Set the persistant position
            var pos = editor.persist('position') || this.options.dialogPosition;

            if (!pos) {
                pos = [10, 10];
            }

            // <debug/>

            if (parseInt(pos[0], 10) + wrapper.outerHeight() > $(window).height()) {
                pos[0] = $(window).height() - wrapper.outerHeight();
            }
            if (parseInt(pos[1], 10) + wrapper.outerWidth() > $(window).width()) {
                pos[1] = $(window).width() - wrapper.outerWidth();
            }

            wrapper.css({
                top: Math.abs(parseInt(pos[0])),
                left: Math.abs(parseInt(pos[1]))
            });

            // Load the message display widget
            editor.loadMessages();
        }

        $(function() {
            wrapper.appendTo('body');
        });

        // Loop the UI component order option
        for (var i = 0, l = this.options.uiOrder.length; i < l; i++) {
            var uiGroupContainer = $('<div/>')
                .addClass(options.baseClass + '-group');

            // Loop each UI in the group
            var uiGroup = this.options.uiOrder[i];
            for (var ii = 0, ll = uiGroup.length; ii < ll; ii++) {
                // Check if the UI component has been explicitly disabled
                if (!editor.isUiEnabled(uiGroup[ii])) {
                    continue;
                }

                // Check the UI has been registered
                if ($.ui.editor.ui[uiGroup[ii]]) {
                    // Clone the UI object (which should be extended from the defaultUi object)
                    var uiObject = $.extend({}, $.ui.editor.ui[uiGroup[ii]]);

                    // Get the UI components base class
                    var baseClass = uiGroup[ii].replace(/([A-Z])/g, function(match) {
                        return '-' + match.toLowerCase();
                    });

                    var options = $.extend(true, {}, editor.options, {
                        baseClass: editor.options.baseClass + '-ui-' + baseClass
                    }, uiObject.options, editor.options.ui[uiGroup[ii]]);

                    uiObject.editor = editor;
                    uiObject.options = options;
                    uiObject.init(editor, options);

                    // Append the UI object to the group
                    uiGroupContainer.append(uiObject.ui);

                    // Add the UI object to the editors list
                    editor.uiObjects[uiGroup[ii]] = uiObject;
                }
                // <strict/>
            }

            // Append the UI group to the editor toolbar
            if (uiGroupContainer.children().length > 0) {
                uiGroupContainer.appendTo(this.toolbar);
            }
        }
        $('<div/>').css('clear', 'both').appendTo(this.toolbar);
    },

    show: function() {
        this.wrapper.css('display', '');
    },

    destruct: function() {
        if (this.wrapper) {
            this.wrapper.remove();
        }
    }
});

                })(jQuery, window, rangy);
            jQuery('<style type="text/css">/* Non styles */\n\
/**\n\
 * Style global variables\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* Base style */\n\
/**\n\
 * Main editor layout\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 */\n\
/******************************************************************************\\n\
 * Editor toolbar\n\
\******************************************************************************/\n\
.ui-editor-wrapper {\n\
  overflow: visible;\n\
  z-index: 1001;\n\
  position: fixed; }\n\
  .ui-editor-wrapper .ui-editor-toolbar {\n\
    padding: 6px 0 0 5px;\n\
    overflow: visible; }\n\
  .ui-editor-wrapper .ui-editor-toolbar,\n\
  .ui-editor-wrapper .ui-editor-toolbar * {\n\
    -webkit-user-select: none;\n\
    -moz-user-select: none;\n\
    user-select: none; }\n\
  .ui-editor-wrapper .ui-dialog-titlebar .ui-editor-element-path:first-child {\n\
    margin-left: 5px; }\n\
  .ui-editor-wrapper .ui-dialog-titlebar .ui-editor-element-path {\n\
    min-width: 10px;\n\
    min-height: 15px;\n\
    display: inline-block; }\n\
\n\
.ui-editor-dock-docked-to-element .ui-editor-toolbar {\n\
  padding: 5px 0 0 5px!important; }\n\
  .ui-editor-dock-docked-to-element .ui-editor-toolbar .ui-editor-group {\n\
    margin: 0 5px 5px 0; }\n\
\n\
.ui-editor-dock-docked-element {\n\
  display: block !important;\n\
  border: 0 none transparent;\n\
  -webkit-box-sizing: border-box;\n\
  -moz-box-sizing: border-box;\n\
  box-sizing: border-box; }\n\
\n\
/******************************************************************************\\n\
 * Inputs\n\
\******************************************************************************/\n\
.ui-editor-wrapper textarea,\n\
.ui-editor-wrapper input {\n\
  padding: 5px; }\n\
\n\
/******************************************************************************\\n\
 * Dialogs\n\
\******************************************************************************/\n\
.ui-editor-wrapper .ui-dialog-content {\n\
  font-size: 13px; }\n\
.ui-editor-wrapper textarea {\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-flex: 1;\n\
  -moz-box-flex: 1;\n\
  -ms-box-flex: 1;\n\
  box-flex: 1; }\n\
\n\
html body div.ui-dialog div.ui-dialog-titlebar a.ui-dialog-titlebar-close span.ui-icon {\n\
  margin-top: 0!important; }\n\
\n\
/**\n\
 * Main editor styles\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 */\n\
.ui-editor-editing {\n\
  outline: none; }\n\
\n\
/******************************************************************************\\n\
 * Inputs\n\
\******************************************************************************/\n\
.ui-editor-wrapper textarea,\n\
.ui-editor-wrapper input {\n\
  border: 1px solid #D4D4D4; }\n\
\n\
/******************************************************************************\\n\
 * Dialogs\n\
\******************************************************************************/\n\
.ui-editor-wrapper .ui-dialog-content {\n\
  font-size: 13px; }\n\
\n\
html body div.ui-wrapper div.ui-dialog-titlebar a.ui-dialog-titlebar-close span.ui-icon {\n\
  margin-top: 0!important; }\n\
\n\
/* Components */\n\
/**\n\
 * Toolbar/path selection bar wrapper\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/**\n\
 * Path selection bar\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-path {\n\
  padding: 5px;\n\
  font-size: 13px; }\n\
\n\
/**\n\
 * Select menu UI widget styles\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-selectmenu {\n\
  overflow: visible;\n\
  position: relative; }\n\
\n\
.ui-editor-selectmenu-button {\n\
  text-align: left;\n\
  padding: 3px 18px 5px 5px !important;\n\
  float: none !important; }\n\
  .ui-editor-selectmenu-button .ui-icon {\n\
    position: absolute;\n\
    right: 1px;\n\
    top: 8px; }\n\
  .ui-editor-selectmenu-button .ui-editor-selectmenu-text {\n\
    font-size: 13px; }\n\
\n\
.ui-editor-selectmenu-wrapper {\n\
  position: relative; }\n\
\n\
.ui-editor-selectmenu-button .ui-button-text {\n\
  padding: 0 25px 0 5px; }\n\
\n\
.ui-editor-selectmenu-button .ui-icon {\n\
  background-repeat: no-repeat; }\n\
\n\
.ui-editor-selectmenu-menu {\n\
  position: absolute;\n\
  top: 100%;\n\
  left: 0;\n\
  right: auto;\n\
  display: none;\n\
  margin-top: -1px !important; }\n\
\n\
.ui-editor-selectmenu-visible .ui-editor-selectmenu-menu {\n\
  display: block;\n\
  z-index: 1; }\n\
\n\
.ui-editor-selectmenu-menu-item {\n\
  padding: 5px;\n\
  margin: 3px;\n\
  z-index: 1;\n\
  text-align: left;\n\
  font-size: 13px;\n\
  font-weight: normal !important;\n\
  border: 1px solid transparent;\n\
  cursor: pointer;\n\
  background-color: inherit; }\n\
\n\
.ui-editor-selectmenu-button {\n\
  background: #f5f5f5;\n\
  border: 1px solid #ccc; }\n\
\n\
.ui-editor-buttonset .ui-editor-selectmenu-visible .ui-editor-selectmenu-button {\n\
  -moz-border-radius-bottomleft: 0;\n\
  -webkit-border-bottom-left-radius: 0;\n\
  border-bottom-left-radius: 0;\n\
  -moz-border-radius-bottomright: 0;\n\
  -webkit-border-bottom-right-radius: 0;\n\
  border-bottom-right-radius: 0; }\n\
\n\
/**\n\
 * Button UI widget styles\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-buttonset {\n\
  float: left;\n\
  margin: 0 5px 4px 0;\n\
  display: inline-block; }\n\
  .ui-editor-buttonset > .ui-button {\n\
    float: left;\n\
    display: block;\n\
    margin: 0 -1px 0 0;\n\
    font-size: 13px; }\n\
  .ui-editor-buttonset .ui-button:hover {\n\
    z-index: 1; }\n\
  .ui-editor-buttonset .ui-editor-selectmenu {\n\
    display: block; }\n\
    .ui-editor-buttonset .ui-editor-selectmenu .ui-button {\n\
      margin: 0 -1px 0 0; }\n\
\n\
.ui-editor-ff .ui-editor-buttonset {\n\
  float: none;\n\
  vertical-align: top; }\n\
\n\
.ui-editor-wrapper .ui-button {\n\
  height: 32px;\n\
  margin-bottom: 0;\n\
  margin-top: 0;\n\
  padding: 0;\n\
  -webkit-box-sizing: border-box;\n\
  -moz-box-sizing: border-box;\n\
  box-sizing: border-box; }\n\
.ui-editor-wrapper .ui-button-icon-only {\n\
  width: 32px; }\n\
\n\
.ui-editor-wrapper .ui-editor-buttonset > .ui-button {\n\
  -webkit-border-radius: 0;\n\
  -moz-border-radius: 0;\n\
  -ms-border-radius: 0;\n\
  -o-border-radius: 0;\n\
  border-radius: 0; }\n\
  .ui-editor-wrapper .ui-editor-buttonset > .ui-button:first-child {\n\
    -moz-border-radius-topleft: 5px;\n\
    -webkit-border-top-left-radius: 5px;\n\
    border-top-left-radius: 5px;\n\
    -moz-border-radius-bottomleft: 5px;\n\
    -webkit-border-bottom-left-radius: 5px;\n\
    border-bottom-left-radius: 5px; }\n\
  .ui-editor-wrapper .ui-editor-buttonset > .ui-button:last-child {\n\
    -moz-border-radius-topright: 5px;\n\
    -webkit-border-top-right-radius: 5px;\n\
    border-top-right-radius: 5px;\n\
    -moz-border-radius-bottomright: 5px;\n\
    -webkit-border-bottom-right-radius: 5px;\n\
    border-bottom-right-radius: 5px; }\n\
\n\
.ui-button-icon-only .ui-button-text {\n\
  display: none; }\n\
\n\
/**\n\
 * Unsupported warning styles\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/* Layout */\n\
.ui-editor-unsupported {\n\
  position: relative; }\n\
\n\
.ui-editor-unsupported-overlay {\n\
  position: fixed;\n\
  top: 0;\n\
  left: 0;\n\
  bottom: 0;\n\
  right: 0;\n\
  background-color: black;\n\
  filter: alpha(opacity=50);\n\
  opacity: 0.5; }\n\
\n\
.ui-editor-unsupported-content {\n\
  position: fixed;\n\
  top: 50%;\n\
  left: 50%;\n\
  margin: -200px 0 0 -300px;\n\
  width: 600px;\n\
  height: 400px; }\n\
\n\
.ui-editor-unsupported-input {\n\
  position: absolute;\n\
  bottom: 10px; }\n\
\n\
/* Style */\n\
.ui-editor-unsupported-content {\n\
  padding: 10px;\n\
  background-color: white;\n\
  border: 1px solid #777; }\n\
\n\
/**\n\
 * Message widget styles\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
/******************************************************************************\\n\
 * Messages\n\
\******************************************************************************/\n\
.ui-editor-messages {\n\
  margin: 0;\n\
  /* Error */\n\
  /* Confirm */\n\
  /* Information */\n\
  /* Warning */\n\
  /* Loading */ }\n\
  .ui-editor-messages .ui-editor-message-close {\n\
    cursor: pointer;\n\
    float: right; }\n\
  .ui-editor-messages .ui-icon {\n\
    margin: 0 0 3px 3px; }\n\
  .ui-editor-messages .ui-icon,\n\
  .ui-editor-messages .ui-editor-message {\n\
    display: inline-block;\n\
    vertical-align: top; }\n\
  .ui-editor-messages .ui-editor-message-wrapper {\n\
    padding: 3px 3px 3px 1px;\n\
    -webkit-box-shadow: inset 0 -1px 1px rgba(0, 0, 0, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.5);\n\
    -moz-box-shadow: inset 0 -1px 1px rgba(0, 0, 0, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.5);\n\
    box-shadow: inset 0 -1px 1px rgba(0, 0, 0, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.5); }\n\
  .ui-editor-messages .ui-editor-message-wrapper:first-child {\n\
    -moz-border-radius-topright: 5px;\n\
    -webkit-border-top-right-radius: 5px;\n\
    border-top-right-radius: 5px;\n\
    -moz-border-radius-topleft: 5px;\n\
    -webkit-border-top-left-radius: 5px;\n\
    border-top-left-radius: 5px; }\n\
  .ui-editor-messages .ui-editor-message-wrapper:last-child {\n\
    -moz-border-radius-bottomright: 5px;\n\
    -webkit-border-bottom-right-radius: 5px;\n\
    border-bottom-right-radius: 5px;\n\
    -moz-border-radius-bottomleft: 5px;\n\
    -webkit-border-bottom-left-radius: 5px;\n\
    border-bottom-left-radius: 5px; }\n\
  .ui-editor-messages .ui-editor-message-circle-close {\n\
    /* Red */\n\
    background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmNWQ0YiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2ZhMWMxYyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\');\n\
    background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #ff5d4b), color-stop(100%, #fa1c1c));\n\
    background: -webkit-linear-gradient(top, #ff5d4b, #fa1c1c);\n\
    background: -moz-linear-gradient(top, #ff5d4b, #fa1c1c);\n\
    background: -o-linear-gradient(top, #ff5d4b, #fa1c1c);\n\
    background: linear-gradient(top, #ff5d4b, #fa1c1c); }\n\
  .ui-editor-messages .ui-editor-message-circle-check {\n\
    /* Green */\n\
    background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2NkZWI4ZSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2E1Yzk1NiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\');\n\
    background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #cdeb8e), color-stop(100%, #a5c956));\n\
    background: -webkit-linear-gradient(top, #cdeb8e, #a5c956);\n\
    background: -moz-linear-gradient(top, #cdeb8e, #a5c956);\n\
    background: -o-linear-gradient(top, #cdeb8e, #a5c956);\n\
    background: linear-gradient(top, #cdeb8e, #a5c956); }\n\
  .ui-editor-messages .ui-editor-message-info {\n\
    /* Blue */\n\
    background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2E5ZTRmNyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzBmYjRlNyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\');\n\
    background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #a9e4f7), color-stop(100%, #0fb4e7));\n\
    background: -webkit-linear-gradient(top, #a9e4f7, #0fb4e7);\n\
    background: -moz-linear-gradient(top, #a9e4f7, #0fb4e7);\n\
    background: -o-linear-gradient(top, #a9e4f7, #0fb4e7);\n\
    background: linear-gradient(top, #a9e4f7, #0fb4e7); }\n\
  .ui-editor-messages .ui-editor-message-alert {\n\
    /* Yellow */\n\
    background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZDY1ZSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2ZlYmYwNCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\');\n\
    background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #ffd65e), color-stop(100%, #febf04));\n\
    background: -webkit-linear-gradient(top, #ffd65e, #febf04);\n\
    background: -moz-linear-gradient(top, #ffd65e, #febf04);\n\
    background: -o-linear-gradient(top, #ffd65e, #febf04);\n\
    background: linear-gradient(top, #ffd65e, #febf04); }\n\
  .ui-editor-messages .ui-editor-message-clock {\n\
    /* Purple */\n\
    background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZiODNmYSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2U5M2NlYyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\');\n\
    background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #fb83fa), color-stop(100%, #e93cec));\n\
    background: -webkit-linear-gradient(top, #fb83fa, #e93cec);\n\
    background: -moz-linear-gradient(top, #fb83fa, #e93cec);\n\
    background: -o-linear-gradient(top, #fb83fa, #e93cec);\n\
    background: linear-gradient(top, #fb83fa, #e93cec); }\n\
  .ui-editor-messages .ui-editor-message-clock .ui-icon.ui-icon-clock {\n\
    background: transparent url(\'data:image/png;base64,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\') no-repeat center center; }\n\
\n\
/* Plugins */\n\
/**\n\
 * Text alignment plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-align-left-button .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAItJREFUeNpi/P//PwMlgImBQsACN4mJqRFIaQExIxQzYWEzQfHlf//+lYL0McK8ADSAJJuBBqC6AAjWYrEN2VYPbAZR1QUb0WxEZmPD1lR3wTYCttpSJQxg6mE0sgt2E/AzCLMBMTsQcwCxAskuQE722FwwEYiNsNjKClR8EUjH4w2DActMFBsAEGAAnS84DrgEl1wAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-align-left-button:hover .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-align-right-button .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAIxJREFUeNpi/P//PwMlgImBQsACN4mJqRFIaQExIxQzYWEzQfHlf//+lYL0McK8ADSAJJuBBqC6AAvYjGYrMhuEHanugo0EbETH1jQPg714bGcGYhOqu2A3AT+DMBvQQnYgzQHECiS7ADnZw9j4wmA61J+sQMUcUFtBtrMC8TEg9kNxwYBlJooNAAgwAJo0OAu5XKT8AAAAAElFTkSuQmCC\') 0 0; }\n\
\n\
.ui-editor-align-right-button:hover .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-align-center-button .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAI1JREFUeNpi/P//PwMlgImBQsACN4mJqRFIaQExIxQzYWEzQfHlf//+lYL0McK8ADSAJJuBBqC6AAlswGErjO2KrJiqLtiIw0Zc2JpmYbCTgM2WFIUBTD2MRnbBbgI2gzAbELMDMQcQK5DsAuRkj80FMDAFiI2RbGUFKuaA2noGiEOwhsGAZSaKDQAIMAB/BzgOq8akNwAAAABJRU5ErkJggg==\') 0 0; }\n\
\n\
.ui-editor-align-center-button:hover .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-align-justify-button .ui-icon {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAJFJREFUeNpi/P//PwMlgImBQsACN4mJqRFIaQExIxQzYWEzQfHlf//+lYL0McK8ADSAJJuBBqC6AAjWYrEN2VZkNgg7Ut0FGwnYiI6tqe6CbUTYCsPMQGxCdRfsJsJmNqCF7ECaA4gVSHYBcrKHsZFdMBGIjbDYygpUzAG1FWQ7KxAfA2I/FBcMWGai2ACAAAMAvPA4C7ttvJ4AAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-align-justify-button:hover .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Basic text style plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-text-bold-button .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAKRJREFUeNpi/P//PwMlgImBQjDwBrCgmMbEpA2kGnGofQ3E9UD86t+/fzhdcBWIpwExMxQ3AHEIEK8BYgkgdsLrAih4A8SsaBYwQcWYiDGAEcmAbiwuJBiIIAPYoLgfiMuBeBmUXwHEXIQMYEIy4BUQXwDiy1C+HBBrEPKCDBCzwwwDpVRGRkZksU8ozkVOykCFVkBqOZ5oB3lpAoqe0bzAABBgANfuIyxmXKp/AAAAAElFTkSuQmCC\') 0 0; }\n\
\n\
.ui-editor-text-bold-button:hover .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-text-italic-button .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAH1JREFUeNpi/P//PwMlgImBQjDwBrBgmMgEN1MbiBvRpOv//ft3FUUEFIjImJGRERnrAPF6IO6BiaGrZyLCi6xAvJDcMLAA4j9AfJlcA/yBeCe5sWAExAJAfIKkWIAFJBAUATE7kM+M143ooQoEVkD8EA1b4Yy10bzAABBgAC7mS5rTXrDAAAAAAElFTkSuQmCC\') 0 0; }\n\
\n\
.ui-editor-text-italic-button:hover .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-text-underline-button .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAKZJREFUeNpi/P//PwMlgImBQkCxASwopjExhQGpMCSheijdiCz279+/q3AeKAxgmJGREYSdgHgdlIaJ6SCLIevB5oXXUJe9RhK7gkUMZxgwAjEzlEYG2MRwGsCKRTErKQawYFHMQqwBn6G2qSCJGULFPmPYhpwSgdEIY6YCcTKa2rlAPBvEAEYjdgNAUYRMowOYWmQ9LFjUPSGQP2RwemFoZiaAAAMAlEI7bVBRJkoAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-text-underline-button:hover .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-text-strike-button .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAL5JREFUeNpi/P//PwMlgImBQkCxASwopjHBzbMB4nQg5oTyrwKxNhAXAfGjf//+EXRBFhC/BOI0KAapYwZpxusCJPASquEdlD8FiHWwKWREjgUkL4gDcQ0QfwfiXqiBcIDsBXQD9hATcEADXOAckAEwzMjIiI4lgHgiEM8GYkmYOLIeXAZ4I2sA4vlQjGEArkBsAeJzQAUVYH8yMnIAKTmC6QAaHhpALALEPCBDoOJfgFQ5wVgYmnmBYgMAAgwAEGZWNyZpBykAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-text-strike-button:hover .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-text-sub-button .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAKZJREFUeNpi/P//PwMlgImBQjDwBrDATWJCMWs6lM7Ep/nfv39YXSAPxL+AWALKJtkLLkB8EohZoWySDbAH4uNQQ+xJNUAJiH8DMT8QPwZiWagYDEwA4v1QGgJACQmEGRkZQTgXiI+i4VyoHAy7AfEaEBucCNEM2AzEKkiKu6BiYMuAdAYQLwZiKQwDgGAVED+E0iBgBeUjiy1HErMCWzyaFxgAAgwA5Gw9vTeiCqoAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-text-sub-button:hover .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-text-super-button .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAALdJREFUeNpi/P//PwMlgImBQjDwBrCgmMaEYt50KJ0JpRuBWBuIrwJx/b9///C6QB6IfwGxBJQNAvVAPAkqRtALLkB8EohZoWwQiAbiICCuI8YAeyA+DjXEHiqmD8SaQLwIysYMAyhQAuLfQMwPxI+B2AkqVkZsLHgDsQYQTwXiVCBmg4phB6CUCMOMjIwgvBmIVaBsEO6CijEgY5geFAOAYBUQP4TSIGAF5SOLoVjMOJoXGAACDACTRz3jjn6PnwAAAABJRU5ErkJggg==\') 0 0; }\n\
\n\
.ui-editor-text-super-button:hover .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Blockquote plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-quote-block-button .ui-icon-quote {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAGVJREFUeNpi/P//PwMlgImBQjAcDWBhYZEA4r1AHA/EKHxiXQBS+BKIF+LgEzTAG4h3I0UvOh+/AUCFbECcDmROA2lC5mMzgAWLGDuUtsTBJ+iFeUDMC6Wx8VEA42hSptwAgAADAO3wKLgntfGkAAAAAElFTkSuQmCC\') 0 0; }\n\
\n\
.ui-editor-quote-block-button:hover .ui-icon-quote {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Clean content plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-clean-button .ui-icon-clean {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABNVBMVEUAAAAAAAAgSocgSocgPnAAAABxcXFPT09YWFggSocgSocoToUbPXgSN3kyYZw0ZqT///8iUZkgSoc1Z6UiUJaJrNkwXpZIeLiOvO03a6s4b7JekNUjUpqCp9eNr9pSjeAwX5g2aqquxuV8otPB1euOsNv8/f6gveFgkdVnkMmbuuVfk9lkk9fK3Pbs8vmWtd5Vjs98odCHqNWkv+Jzms6Qt+xnmNuzyudVidS90u6hwe5mmuQtXKCow+OqxepNg82Xtd3C1Ox0m89vl8x3oNl4n9NSjuDi7PqlxO+MtOyWtt2fwO60y+dUjt5zm8/L2+9qneT3+f7g6/qDrelRi95snuWowuSfvOGPr9uwyeqRsdqUs9qat92OrtmDptN5ns9Rh8hqk8uXuehwnt1vl83e6vmZu+gBAK69AAAADXRSTlMbAKM01gogSSmAy7W1OP1GaAAAAM1JREFUeF5VzNN2A1EAQNE7TIrrsSe0Udu2zf//hHZWk672PO6HAySR/UmUwBjT9XyzeJlZuGpe60wE474TxxghhHEcOz4DzLcxRoZhJGT/AOcoiiKEOE9AZEGw291fOcpNdZeD74fEqKZ5lFLP0+YplIDAzBfXrTQKNyW3bEIhgV51QD5fyVv1fQir0zOzcxfW4tLaCGqkHoYWWR/BxubW9k5/7+PgcAjZ8JicnJKz82wC6gRstTu3d/cPj0/PcFIF6ZQMf5NTaaCAfylf1j4ecCeyzckAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-clean-button:hover .ui-icon-clean {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Clear formatting style plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-clear-formatting-button .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGxcPH7KJ9wUAAAEKSURBVDjL3ZG9SgNBFIW/I76D1RIEazEIFitWNguxUPANUkUIKG4jYiEBC7WwUFJZiNssFvoOFipMFx/AoIVVEAvxB7w2MyBhV5Iq4IHLPecy9zBzBv4nJLUltQc5O1awXAE+gAnPhzMAFoE7YNzzoQ0WgBvg1vPBDSRNAl9m9gC4ebPpc+jkkADkkOTggi4KryFpV9KMpHgfXr/T1DJwGWxn4IIuM7iQdB1qDu73oPder9spuNDPYLZoeUrSZd9saQUej6DzUqvZCbhj2Pjr+pu/ZzuwnMLbc7Vqh+BCPyjIIAaefMVhuA69bhTZGnyuwlULXDeKrFWWQT+akDTAbfk3B90s+4WR4Acs5VZuyM1J1wAAAABJRU5ErkJggg==\') 0 0; }\n\
\n\
.ui-editor-clear-formatting-button:hover .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Click to edit plugin\n\
 *\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-click-to-edit-message {\n\
  padding: 10px;\n\
  border: 1px solid #D4D4D4;\n\
  font-size: 13px;\n\
  z-index: 4000;\n\
  color: #000;\n\
  text-shadow: none;\n\
  -webkit-pointer-events: none;\n\
  -moz-pointer-events: none;\n\
  pointer-events: none;\n\
  -webkit-border-radius: 5px;\n\
  -moz-border-radius: 5px;\n\
  -ms-border-radius: 5px;\n\
  -o-border-radius: 5px;\n\
  border-radius: 5px;\n\
  background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2YyZmZmMiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2RhZjJkNyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\');\n\
  background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #f2fff2), color-stop(100%, #daf2d7));\n\
  background: -webkit-linear-gradient(top, #f2fff2, #daf2d7);\n\
  background: -moz-linear-gradient(top, #f2fff2, #daf2d7);\n\
  background: -o-linear-gradient(top, #f2fff2, #daf2d7);\n\
  background: linear-gradient(top, #f2fff2, #daf2d7);\n\
  -webkit-box-shadow: 0px 2px 10px #cccccc;\n\
  -moz-box-shadow: 0px 2px 10px #cccccc;\n\
  box-shadow: 0px 2px 10px #cccccc;\n\
  -webkit-transition: opacity 0.5s;\n\
  -webkit-transition-delay: 0s;\n\
  -moz-transition: opacity 0.5s 0s;\n\
  -o-transition: opacity 0.5s 0s;\n\
  transition: opacity 0.5s 0s;\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=0);\n\
  opacity: 0; }\n\
\n\
.ui-editor-click-to-edit-visible {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-click-to-edit-highlight {\n\
  cursor: pointer;\n\
  outline: 1px dotted rgba(0, 0, 0, 0.5);\n\
  -webkit-transition: all 0.5s;\n\
  -webkit-transition-delay: 0s;\n\
  -moz-transition: all 0.5s 0s;\n\
  -o-transition: all 0.5s 0s;\n\
  transition: all 0.5s 0s; }\n\
\n\
/**\n\
 * Basic color picker plugin.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-color-picker-basic-select .ui-editor-selectmenu-menu {\n\
  min-width: 100px; }\n\
\n\
.ui-editor-color-picker-basic-select span {\n\
  padding-left: 2px; }\n\
\n\
.ui-editor-color-picker-basic-swatch {\n\
  width: 16px;\n\
  height: 16px;\n\
  float: left;\n\
  margin-top: 2px;\n\
  border: 1px solid rgba(0, 0, 0, 0.2); }\n\
\n\
/**\n\
 * Debug plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-debug-reinit-button .ui-icon-reload {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAqBJREFUeNqkU01PE2EQnrfdtmyLpbRNA/ULGyAhRi+NHkTk5sEEiRyMEi+evHszJh5I/AF613ho9EIwhEiMB4kSjQcWSDxgIAhJoZV26dd2t/v17jqzkoLGG5vM7rvzzPPsfOww13XhOJdAt8vPN0EIBEAQBPD5/UHGWALdnWgW2iO07H+40sL91APhH2ev4HOH+tJiZzoZCia7guXpj8XsnevprGX9yVQMM8i9K0jA2GI7A+9y3Uwo4I6Mj6aijToHzl2nXrNk27bBMDg0FQ7dcQFezeYljH6PlmsLuI4T8zF+e+zqqZ69ggaKZrH13WaxXDcUwm2LQ6xbgOKOCreu9WTfLuQVy3bSCBV8XoBpjmR6xYvFfKNflpuZTyuF1q+y8sHhXLINA7q6g/Byek06ERWgUlJh8EykHzkTxPUETMMYTcWCQ/Wqllnb3hct0/yM01nWVZUwePZiWcLnt0Vpd1NvmZCMBuL4PtwuwdL1S37GMqpuQaFUL+Mk5rllgeM41BuqeZH5/bmNzdJSbzQEiUggjJyBtgCqRVTDjqrc9c6YOjbRhlCHSON9YKMYGQpDrWVDh2F7mR2WoOsbezVdU30CdMXEGNY3abZ0rLcEVVkGpVqlPk0SRjEUS5y2gGUYX7byckURgnB66OxJ7MFD7MHkAQZ0Jh9hFEOxxDkUMM2ZrR/bMo+IsA3hjuzN4fPpvtQUjneJjM7kI4xiKJY4xGW0C9F7bwDrHvNHwk8T4zcutGz0hRjEQp4+1AwHGoYLosBgf3b+O1e1x9iPuUbu7uGfiEJzerUGu6+npwKDA8lm5lx8J54Ie2lWapr7c6tSWd+QwTSfYGPn/lqmoyKOpkn2yuoErKxeQdfgAbSO9hWXbAa/XDjKYcdd598CDAAkzn7JYhVZYAAAAABJRU5ErkJggg==\') 0 0; }\n\
\n\
.ui-editor-debug-reinit-button:hover .ui-icon-reload {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-debug-destroy-button .ui-icon-close {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAtFBMVEX///+nAABhAACnAACjAACCAACgAACHAACjAAByAAB1AAByAACDAACnAACCAACHAACgAACNAACbAACXAACMAACSAABfAACYAACRAACjAACbAAChAACqAACNAACcAACHAACqAADEERGsERHQERG+NjaiERHUTEzYERG4ERGlFBSfFRX/d3f6cnK0JSWoHh7qYmLkXFyvFRXmXl7vZ2fNRUX4cHDXT0/+dnbbU1O3Li7GPT26MTG2f8oMAAAAIXRSTlMASEjMzADMzAAASMxIAMwAAMzMzEjMzEhISABIzABISEg/DPocAAAAj0lEQVR4Xo3PVw6DMBBF0RgXTO+hBYhtILX3sv99RRpvgPcxVzp/M5syb7lYepxDABDeYcQ5wg+MAMhr3JOyJKfxTABqduuvjD37O6sBwjZ+f76/7TFuQw1VnhyGYZPklYagKbKLlDIrmkBDGq1hUaqhM4UQJpwOwFdK+a4LAbCdlWNTCgGwjLlhUQqZ8uofSk8NKY1Fm8EAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-debug-destroy-button:hover .ui-icon-close {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Dock plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-dock-button .ui-icon-pin-s {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAbFJREFUeNpi/P//PwMlgAVEPGNiIqTOBojz/zIwTHrPwHD4BZDzGGhxMhAzEWlRvtTy5SE/GRiKge61R5YgyoB/IHVPnzIoTprk/52BoRJoiDNBA5BCxuY3UN2vz58Znu7ZwyAaHOz+8f//RqC8OzEuAPtdcfbsgM937zJ8+fKFgePHDwa3sDBroKGt8EBEAo1ArAV1ARPQucwqs2f7vz14kOHH378MF/buPQ4S+wXEQPkauAG3EFHp7bBihTHDs2cMf4E2ffvwgQGmeeuyZWf+MDA0ATXs+I8eiP+gGBhNNTsjIs7+5+Vl+HTrFsOry5cZXr56xXB02bKjQM21QCU7sKaDRYiA2wE0RPJnamq2VVGR8adr1xi4uLkZPjMwsDJCNf/HagAjI8SA//95gRRb5pEjxnttbM6aeHsb87CwMED9DAZ/0QxAjgVmRkZGj+vXr0+wt7evWc3ENPfI1q1n2djYGP4TSsqMEBfYLV26tExXVzcfyF8NdM17oG33V69e3QKUO0vIAF1PT8+Y2NhYUDRuh7n0PyTEdzAQ4YKYHTt2TAEyz5OaGxkpzc4AAQYAvlOuK2pYar0AAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-dock-button:hover .ui-icon-pin-s {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-dock-button .ui-icon-pin-w {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wFFgA2AnOoAZ4AAAH4SURBVDjLtZNNaxNhFIXPfefNJJlkppFI09Ca1FiRMiDduCjWQltdtILdu1DcSkpx7UL6A1zGH+BKEFy5MkhErRvpwo+NSDEaaYyZSZNJJslkPl43XQQaaUA8u3M5PFwu5wL/KBo1FEC4DJALiN2jjAWIbcA5EVABzotkUu+ZJmvLsmQwJtcHA2oHQc8FXm8D9eE8HzafgThPpS5H19Zux4kmIqbJWL3OT/u+9LNWK1er1V8PgMMdwBsJ8AARtFoD6na1qK7PubFYTOOc9RqNQxEEX1ygswP4Jx6mDNw3Fhc/WVtb4uPy8uAx0YeHwMaoLBs1DBE9kzTtIJLJ4FQ6LQnghZVMFscCCIB8IeKB7/e6lYpjNZs2V1WeNk02FuApwAJA8xwnFHgeSUL4rmVJ3yIRfyzAFWA+Oj29EZqcvODYNveJEloisZnq9++NAkjD5gCY59nsnfjq6iafnT3bNQzJrtWQzeUm+p3OxQXbll8Cb45tYBGRKcucEd2Irq/fDC8tzSm5nKRMTSEUi3lcUXB1ZSV1RlVvPWLs2rEiaUIIDAbee+AtisWMUyqpRhAoiq7rLdtudvf2fsQlqWe02yQDr/7axEvAbml///uTcHjhqyxncjMz5zqO87th28+vu+47GWjfBdyxP61QKFA+nydVVQn/S38ATpHDEx6slP8AAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-dock-button:hover .ui-icon-pin-w {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Dialog docked to body\n\
 */\n\
.ui-editor-dock-docked {\n\
  z-index: 10000; }\n\
  .ui-editor-dock-docked .ui-editor-toolbar-wrapper {\n\
    position: fixed;\n\
    top: 0;\n\
    left: 0;\n\
    right: 0;\n\
    border-top: none;\n\
    display: -webkit-box;\n\
    display: -moz-box;\n\
    display: -ms-box;\n\
    display: box;\n\
    -webkit-box-pack: center;\n\
    -moz-box-pack: center;\n\
    -ms-box-pack: center;\n\
    box-pack: center;\n\
    -webkit-box-align: center;\n\
    -moz-box-align: center;\n\
    -ms-box-align: center;\n\
    box-align: center; }\n\
  .ui-editor-dock-docked .ui-editor-toolbar {\n\
    text-align: center; }\n\
  .ui-editor-dock-docked .ui-editor-path {\n\
    position: fixed;\n\
    bottom: 0;\n\
    left: 0;\n\
    right: 0; }\n\
\n\
.ui-editor-ios .ui-editor-dock-docked .ui-editor-path {\n\
  display: none; }\n\
\n\
/**\n\
 * Dialog docked to element\n\
 */\n\
.ui-editor-dock-docked-to-element-wrapper {\n\
  font-size: inherit;\n\
  color: inherit;\n\
  font-family: inherit; }\n\
\n\
.ui-editor-dock-docked-to-element-wrapper .ui-editor-wrapper {\n\
  /* Removed fixed position from the editor */\n\
  position: relative !important;\n\
  top: auto !important;\n\
  left: auto !important;\n\
  border: 0 none;\n\
  padding: 0;\n\
  margin: 0;\n\
  z-index: auto;\n\
  width: 100%;\n\
  font-size: inherit;\n\
  color: inherit;\n\
  font-family: inherit;\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-orient: vertical;\n\
  -moz-box-orient: vertical;\n\
  -ms-box-orient: vertical;\n\
  box-orient: vertical; }\n\
  .ui-editor-dock-docked-to-element-wrapper .ui-editor-wrapper .ui-editor-toolbar {\n\
    margin: 0;\n\
    z-index: 2;\n\
    -webkit-box-ordinal-group: 1;\n\
    -moz-box-ordinal-group: 1;\n\
    -ms-box-ordinal-group: 1;\n\
    box-ordinal-group: 1; }\n\
  .ui-editor-dock-docked-to-element-wrapper .ui-editor-wrapper .ui-editor-toolbar .ui-widget-header {\n\
    border-top: 0;\n\
    border-left: 0;\n\
    border-right: 0; }\n\
  .ui-editor-dock-docked-to-element-wrapper .ui-editor-wrapper .ui-editor-path {\n\
    border: 0 none;\n\
    margin: 0;\n\
    -webkit-box-ordinal-group: 3;\n\
    -moz-box-ordinal-group: 3;\n\
    -ms-box-ordinal-group: 3;\n\
    box-ordinal-group: 3;\n\
    -webkit-border-radius: 0;\n\
    -moz-border-radius: 0;\n\
    -ms-border-radius: 0;\n\
    -o-border-radius: 0;\n\
    border-radius: 0; }\n\
  .ui-editor-dock-docked-to-element-wrapper .ui-editor-wrapper .ui-editor-messages {\n\
    margin: 0; }\n\
\n\
.ui-editor-dock-docked-element {\n\
  /* Override margin so toolbars sit flush next to element */\n\
  margin: 0 !important;\n\
  display: block;\n\
  z-index: 1;\n\
  -webkit-box-ordinal-group: 2;\n\
  -moz-box-ordinal-group: 2;\n\
  -ms-box-ordinal-group: 2;\n\
  box-ordinal-group: 2; }\n\
\n\
/**\n\
 * Messages\n\
 */\n\
.ui-editor-dock-docked .ui-editor-messages {\n\
  position: fixed;\n\
  top: 0;\n\
  left: 50%;\n\
  margin: 0 -400px 10px;\n\
  padding: 0;\n\
  text-align: left; }\n\
  .ui-editor-dock-docked .ui-editor-messages .ui-editor-message-wrapper {\n\
    width: 800px; }\n\
  .ui-editor-dock-docked .ui-editor-messages .ui-editor-message-wrapper:first-child {\n\
    -moz-border-radius-topright: 0;\n\
    -webkit-border-top-right-radius: 0;\n\
    border-top-right-radius: 0;\n\
    -moz-border-radius-topleft: 0;\n\
    -webkit-border-top-left-radius: 0;\n\
    border-top-left-radius: 0; }\n\
\n\
/**\n\
 * Embed plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-embed-button .ui-icon-youtube {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAxlBMVEX////////fNzfaMTHVLCzKISHFGxvvR0flPDzpSEjdMTH4Y2PaKyvtTk7PJibXIyOnLi7lQECkKyvSHR3mPj6eJCSUGhqRFxfqQkL0XFziOTmOFBSBBwehKCiHDQ3PFRWaISGXHR3wVlaECgqqMTGLEBDGHR365eW1ICDaXFz139/LDg7NLi6tNDTSKSnMNzd9AwP1TEy/Fhbwxsbqv7+7EhKzFBS6EBDonZ3akJDkhISxBwf8a2vLIiLPcHD88fH67+/fYGAnLmvBAAAAAXRSTlMAQObYZgAAAJtJREFUeF5Vx0WShFAUBMB631F3afdxd7v/pQaiN5C7BK4mgM3nxAahczfihIgrrfVTqs+qGN2qLMvHwy4tB6sOmWeMIXp7/jI9L8PCYowR0e/3xzVj1gLLiHNOg9OR82iJvBZC0GD/J0Sdo7B93+/78+737AKNK6Uker2UA7fBNlBKPdyos2CLWXI/ksywnr+MzNdoLyZa4HYC/3EAHWTN0A0YAAAAAElFTkSuQmCC\') 0 0; }\n\
\n\
.ui-editor-embed-button:hover .ui-icon-youtube {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-ui-embed .ui-dialog-content .ui-editor-embed-panel-tabs {\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-orient: vertical;\n\
  -moz-box-orient: vertical;\n\
  -ms-box-orient: vertical;\n\
  box-orient: vertical;\n\
  height: 100%;\n\
  width: 100%; }\n\
  .ui-editor-ui-embed .ui-dialog-content .ui-editor-embed-panel-tabs > div {\n\
    display: -webkit-box;\n\
    display: -moz-box;\n\
    display: -ms-box;\n\
    display: box;\n\
    -webkit-box-orient: vertical;\n\
    -moz-box-orient: vertical;\n\
    -ms-box-orient: vertical;\n\
    box-orient: vertical;\n\
    -webkit-box-flex: 1;\n\
    -moz-box-flex: 1;\n\
    -ms-box-flex: 1;\n\
    box-flex: 1;\n\
    -webkit-box-sizing: border-box;\n\
    -moz-box-sizing: border-box;\n\
    box-sizing: border-box; }\n\
    .ui-editor-ui-embed .ui-dialog-content .ui-editor-embed-panel-tabs > div > p:first-child {\n\
      padding-top: 10px; }\n\
    .ui-editor-ui-embed .ui-dialog-content .ui-editor-embed-panel-tabs > div textarea {\n\
      display: -webkit-box;\n\
      display: -moz-box;\n\
      display: -ms-box;\n\
      display: box;\n\
      -webkit-box-flex: 4;\n\
      -moz-box-flex: 4;\n\
      -ms-box-flex: 4;\n\
      box-flex: 4; }\n\
\n\
/**\n\
 * Float block plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-float-left-button .ui-icon-float-left {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAS5JREFUeNpi/P//PwMlgImBQsACY1zaIH4A6Bp7dAUzV31jnLHy22YgkxFqIQhf/vfvXymKAQ8eidtra35lYAQqY+FgZWBmZ2X49fk7AxvbX6DsN1+CLlgwn5khMECAwcLiL4OogiIDj6QEw9uLZ4AGfAVJ70BzAQg7ohigrnaP4cEDLoY3bzkYzL6/ZVA34ma4ev07w/sPv0HSHgRdoKICUvgR6IWPDK8evWb49+8iw/1bfxhevwYbsBfNdhC2BkkwwqLRxRhuFgM3HyMDrwAjw8vH/xj2nvuH1WZgIDKgGMDExLQNiz9xYWagASboBpAU/zAXsCCJ7SbCZjaghexAmgOIFUh2AXKyh7GRXTARiI2w2MoKVMwBtRVkOysQHwNiPxQXDFhmotgAgAADAKYzbYynfqX2AAAAAElFTkSuQmCC\') 0 0; }\n\
\n\
.ui-editor-float-left-button:hover .ui-icon-float-left {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-float-none-button .ui-icon-float-none {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAkFBMVEUAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAAAABAQEAAADRrxbRsBYBAQEBAQEBAQEBAQEBAQEBAQEBAQEAAAAAAAAAAACcegnCrQ6ffgqukQv+/GixkS3duyLhwyfkyizevSNRMDCigDLauC/y41DcuiLrzTTQrhWCYBiObSDErz3r4VvApCt4Vg6dewnDaH3NAAAAGHRSTlMAycfDxcu9v8HYu+DAwIm3uZnRkdDn7LIyy/h+AAAAWklEQVR4Xp2KRwqFMBQAYzfGXmPtvfx//9spgvAWQcRZzgx6gz6dGEDkQ1FWNRBN2/XZCMRvXtZtB4LSfxon6AHTsjVZUQWR5xz2cWfJxYR9eFf2MQnCCH3hAIfwBUXJe8YuAAAAAElFTkSuQmCC\') 0 0; }\n\
\n\
.ui-editor-float-none-button:hover .ui-icon-float-none {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-float-right-button .ui-icon-float-right {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAS1JREFUeNpi/P//PwMlgImBQsACN4mJqRFIaQExIxQzZYRzBaaHcWE4kZGJ8aCe/0sHFAOAoB5d4avXfAwPH4swaGt+ZWAEGsnCwcrAzM7K8Ovzd3sMFwDBWpjNMPrK5b++C94yMwQGCDBYWPxlEFVQZOCRlGB4e/EMAzYDgtFdICr6kUFd7QfDgwdcDG/ecjCYfX/LoG7EzXD1+ncGeyNMAzYiuQDsCmHhf54qKr+BzI9AL3xkePXoNcO/fxcZ7t/6wwDzAyMsGoGBiDWUnQwR4tx8jAy8AowMLx//Y9h95g+GAdvQXIAPM//798+EKBfgAkADMMJgNxE2swEtZAfSHECsQLILkJM9jI3sgolAbITFVlagYg6orSDbWYH4GBD7obhgwDITxQYABBgAdBpg+9sXURwAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-float-right-button:hover .ui-icon-float-right {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Font size plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-font-size-inc-button .ui-icon-font-size-inc {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAOhJREFUeNpi/P//PwMlgImBQkCxASxgU5gwzJkOpTORBZ2ilzO8+MjFwMIixnBhnTlOF8gD8U8gFoey4UBSyZooLzgD8Umo65xhgsYu5USHgS0QHwfiE1A2TtuxGaAIxL+B+AEQnwFiaagYg6Qi2AAHIP4PpbEa4AHEz4HYAIi/QL3hgSS/H4gfQmlELCAHNBBLQGlksenP7x9l4Bc3YMTnBRWogbZIuBOIZUFyW2b5EQwDVyA+giYPcionSA6U5Jc0yTK8vrUcVQU0L1gB8RMotkKSXoMkXgQT5BM3A+sDYcahn5kAAgwArro7Z1GYijsAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-font-size-inc-button:hover .ui-icon-font-size-inc {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-font-size-dec-button .ui-icon-font-size-dec {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAKxJREFUeNpi/P//PwMlgImBQjAMDGBBMY0Jbp4JEFcAcQcQnwEJpLa/Zfj27SvD+fPnGVhYxBgurDPH6wI9IP4DpRmMXcpJ9oIZELcBcRiaOCjOH0BpnAYoAbE6EE8EYnYgtjq7pxMm5wjE8lAapwFOQLwFiIuB+AQ0PBi2zvYHUQeAmBFKYxoATJWWQOwLxJJAfA6I5YE4FyT+9O5hBiSXwAHjaFKm3ACAAAMA85o8WKYZErQAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-font-size-dec-button:hover .ui-icon-font-size-dec {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Show guides plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-show-guides-button .ui-icon-pencil {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAHZJREFUeNpi/P//PwNFAGQAIyMjDK9BYqNgXHqZ0MSYcFmEyxBGsClMTGS5+t+/fxg2biLGAGTXoBvATGoYkuUFGMDmhd2kGjL4vHCUUi9cIjcpnwPi2UAsBaXPQZPwOXxscD5Cy0xLSbUc3YDnJLue0uwMEGAA2O1APJOrHFQAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-show-guides-button:hover .ui-icon-pencil {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-ui-show-guides-visible * {\n\
  outline: 1px dashed rgba(0, 0, 0, 0.5); }\n\
\n\
/**\n\
 * History plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-undo-button .ui-icon-undo {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAe1JREFUeNrEUzFrFEEU/mazu7d3x8U9g0ROwkHEwrSrNmksJBxok1RRwUIEz0awFStZoqQw5B9ok1jYiRDBwl4PSaFJVLCMMfHWS7zb3ZndGd9ssgdXiVzhwGNnH+/75n3vm2FKKQyzDAy5zKmHLRSKRdiOA6tQgGlZDcrPUme3dcFBEPSLlZQQcZyFTFN8WZiGOUCnVCMRws9/4zD8BwkEFpz7N66c8vQJUbeLNEn+LuEQqxo8jv0716e8/f0UPIp0+n1OTbFLsUF1z+n7boAgA0eRf/em521tdeE4BuYunfa0OYehEMUJ3wt6Fza+7s4EkVwh3DJFLyPgYejfa0576+u/MsZe70g/tX8QRujSHDgXtpTpmOvarkjYrZ97Qg/xUTYDOv3B46U3rcnJMqRUUKaBtsXwzWDYJmfax1y0x07gx/FxfLbckd+1Wj0dYddI8vlcwhp1gcUnr/z55mXvbcfA99WXrVwjMwzGHNs0yiWbVSpFXqtVMTFxkrU+zOt55ENc04N7tvTCP9O86mn76D6cIzDSODYRhhUEnXFguy4/bs6gWr1IubN9F3KShHN8Wn6a3QNtZaFU0lvtZXAUm1LK13Jn5z7Vzw0Q9EmE0NvZDNnpoDw6OuC7voFUs0C19Uzif39MQxP8EWAA91//GdkHdYEAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-undo-button:hover .ui-icon-undo {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-redo-button .ui-icon-redo {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAd9JREFUeNrEU89LG0EUfjP7KyvEGsRorRhoySGCuSyht0IPgicFQZCcvXsvHoP/Q8FDKZRCpQityKIHvZT2YI6t6MUfCJqQKpt1d7Ozu7N9O9vWhIIUcvDBt/OY4X3z3vfNkjiOoZ+g0GfIyaf46gtQSQJF0wQIvePN5nJiJYS8xmUzDAIz8H1gnQ74npcS3BeubYOm60lqCKQjm/89QhSG0HEcSG6tzo4bAWM1JJntGaE7UNQKcL6EaQkxknQfcS6Imk0GizOTxrvPx7Xf4pvdBAOc85VBnVTLU6OPhx8NZBVZUjmPIYpStNsMGo0I5l8+NT5sfxckggCFAYrFzyaHlo1yoYDdSs2WD9e2A/atC4wFooMkJBT79EqBF88Lxu7eYU0QMN+v5Eey1enSRKF1y6ULFoKFAFUDntMgwpsiDuAEMbgBhydDKmxtH9TRmdWUwPOWSsXi2Fmr7RyfNG6sa9vzbI+FHT+MI3730hbmjIwEcLTxSRSrup5qgH6Wvn39cd76ae9TSndw6wzRQNiSooQxiohjHij4Pqy379PiTMb86wJalL+6ZB+pLK9RSv+x0XddkQfrb9K2VdXssRHZk4M1mRDc6XXWsaw/aT15ibKimN3n5MF/pr4JfgkwANDA599q/NhJAAAAAElFTkSuQmCC\') 0 0; }\n\
\n\
.ui-editor-redo-button:hover .ui-icon-redo {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Horizontal rule plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-hr-button .ui-icon-hr {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAXhJREFUeNpi/P//PwMTExMDEmgEYi0gZsSCrwJxNUzhv3//GBixGEA0ABnAgkV8LZqtTFDaF6aAX8KCwdBrA4QDckFq+1sGSUVrBkZGRqKwvEEhg2PyS7BeuAv07AsZXjw4BmJuQLIV5gImJLYrv7g53LlwA8TkLRgCi28wXDzQF/Dr10+G379/M/z58wfoz/9gfUxMrAzMzGwMsnr5DBwcvBgGHABiexBDyTiV4cuXTwxfv35j+PHjB9CQ/0BnszCwsHAysLHxIofVQSB2gBlgnxogAqREiI6B+ikf7ZFdcHD2hjf2X79+Zfj8+TNeF7Cz84K9wMrKdRDZAAcQ8fbJaYYndw4zYAsDHlFjBjZxKwyXwAPx1cMTDIdWxoKY+5BCHo7f31tp8VM9iUFQ0oaBQ9YBYQIoLo1dygmmA2QgIGHJoGhUCtaLLSkfweICVqA6diDNAcQKyJYTlRdAanCJY8sL04HYFM3WM0Acgs0QRlymEwsAAgwAwwCYinucCRoAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-hr-button:hover .ui-icon-hr {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Internationalisation plugin\n\
 *\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-wrapper .ui-editor-i18n-select {\n\
  height: 23px;\n\
  top: -8px;\n\
  text-align: left; }\n\
\n\
.ui-editor-wrapper .ui-editor-i18n-select .ui-editor-selectmenu-status {\n\
  font-size: 13px;\n\
  line-height: 10px; }\n\
\n\
.ui-editor-selectmenu-menu li a, .ui-editor-selectmenu-status {\n\
  line-height: 12px; }\n\
\n\
.ui-editor-wrapper .ui-editor-i18n-select .ui-editor-selectmenu-item-icon {\n\
  height: 24px;\n\
  width: 24px; }\n\
\n\
.ui-editor-selectmenu-menu .ui-icon.ui-editor-i18n-en,\n\
.ui-editor-wrapper .ui-icon.ui-editor-i18n-en {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAALCAIAAAD5gJpuAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAflJREFUeNpinDRzn5qN3uFDt16+YWBg+Pv339+KGN0rbVP+//2rW5tf0Hfy/2+mr99+yKpyOl3Ydt8njEWIn8f9zj639NC7j78eP//8739GVUUhNUNuhl8//ysKeZrJ/v7z10Zb2PTQTIY1XZO2Xmfad+f7XgkXxuUrVB6cjPVXef78JyMjA8PFuwyX7gAZj97+T2e9o3d4BWNp84K1NzubTjAB3fH0+fv6N3qP/ir9bW6ozNQCijB8/8zw/TuQ7r4/ndvN5mZgkpPXiis3Pv34+ZPh5t23//79Rwehof/9/NDEgMrOXHvJcrllgpoRN8PFOwy/fzP8+gUlgZI/f/5xcPj/69e/37//AUX+/mXRkN555gsOG2xt/5hZQMwF4r9///75++f3nz8nr75gSms82jfvQnT6zqvXPjC8e/srJQHo9P9fvwNtAHmG4f8zZ6dDc3bIyM2LTNlsbtfM9OPHH3FhtqUz3eXX9H+cOy9ZMB2o6t/Pn0DHMPz/b+2wXGTvPlPGFxdcD+mZyjP8+8MUE6sa7a/xo6Pykn1s4zdzIZ6///8zMGpKM2pKAB0jqy4UE7/msKat6Jw5mafrsxNtWZ6/fjvNLW29qv25pQd///n+5+/fxDDVbcc//P/zx/36m5Ub9zL8+7t66yEROcHK7q5bldMBAgwADcRBCuVLfoEAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-selectmenu-menu .ui-icon.ui-editor-i18n-zh_CN,\n\
.ui-editor-wrapper .ui-icon.ui-editor-i18n-zh_CN {\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAALCAIAAAD5gJpuAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAFqSURBVHjaYrzOwPAPjJgYQEDAleHVbhADIvgHLPgHiQ0QQCxAlkR9NW8sw+cV/1gV/7Gb/hV4+vfzhj8Mv/78//Pn/+/f/8AkhH1t0yaAAAJp4I37zyz2lDfu79uqv/++/WYz+cuq/vvLxt8gdb+A5K9/v34B2SyyskBLAAII5JAva/7/+/z367a/f3/8ZuT9+//Pr78vQUrB6n4CSSj6/RuoASCAWEDO/fD3ddEfhv9/OE3/sKj8/n7k9/fDQNUIs/+DVf8HawAIIJCT/v38C3Hr95N/GDh/f94AVvT7N8RUBpjxQAVADQABBNLw/y/Ifwy/f/399ufTOpDBEPf8g5sN0QBEDAwAAQTWABEChgOSA9BVA00E2wAQQCANQBbEif/AzoCqgLkbbBYwWP/+//sXqBYggFhAkfL7D7OkJFCOCSj65zfUeFjwg8z++/ffX5AGoGKAAGI8jhSRyIw/SJH9D4aAYQoQYAA6rnMw1jU2vQAAAABJRU5ErkJggg==\') 0 0; }\n\
\n\
/**\n\
 * Image resize plugin\n\
 *\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-image-resize-in-progress {\n\
  outline: 1px dashed rgba(0, 0, 0, 0.5); }\n\
\n\
/**\n\
 * Length plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-length-button .ui-icon-dashboard {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAhFJREFUeNrEk7tv01AUxr/4kcRO7Fh1HghFgSAeYglDlIfUbGEBhaWoUxFiQWJGMDDyhzB2ZmANYmAoIvQPaIHIkVJjKyWkcdzYSR1zbhSGQhFDB47007333PN9V/cVCcMQ5wkO54wIxe+5q8Rt4gaRW+VsYo9oE1/+ZpAktjKZzL1arXatWCzmFEVhOYzH40m327U7nc7nwWDwhlLbxITN8SsDVvisXq9vtVqtuqZp2XK5HDcMg5vNZlylUon7vq+XSqXLi8WiYJqmTvWfiNkvg8e06gMqLDmOI5AIvV4P8/l8CeuzHMHn8/kcmeiWZQWk6zCD67quP280GuXNdlv4qKrwTk6WwpXoFNVqNTKdTtf6/X7C87wPzOAhrX4nCIK195KEp4aBtxyHKRm4roujozGdwQSO49LYx/7+VzIPeVEUOcsyh+wab9Ge0+SKGW3nhSzj5WiEoWlhMvHolKOIRmVIkgpZVhGPKxAEGdlsIc20zOASz/NSs9lkl4IwJuOJH+CVksDi2APPx0iYIgNlCTNYXy8hmdQkpmUGCfag2u134DgJipKGdqGAR6NjbKdVOAMbQRAiRsaCEKMaHru7XdYutRw95R+Hh0NXVTNIpXQy0KDrOVy8chOb34Z4XcjCMvZoO86p12bbBy7Tsv5dYoc4OAtFFM3BxkZ4xtzOSvvPuE98X7V//oX//ht/CjAAagzmsnB4V5cAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-length-button:hover .ui-icon-dashboard {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Link plugin\n\
 *\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-link-button .ui-icon-link {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAilBMVEX///8EBARUVFRUVFQEBARTU1MqKiwfHx5MTEzGxsZNTU1FRUWAgH8SEhJnZ2fd3d06Ojrg4ODIyMgODg4DAwMSEhLCwsGcnKXExNEvLy+ysrh+foMQEBBBQUEEBATJydeenqcDAwPT09OIiIjj4+OZmZl3d3fU1OPCwsHW1tXq6urr6+va2trGxsaRnmwcAAAAI3RSTlMAimdfRTOWgDXbAGXFj339cv3dAHtC3OP8bt+2cnuA/OMA+Akct2IAAABoSURBVHhetcVZFoIgGAbQ7wcVwyEKtBi01OZh/9urw2EJdV8ufkHmnDHG85RE2a7Wp812GGJtiaqvG1rOXws1dV9BzWKi2/3xfL1pErOCdT6YS2SCdxZdsdtfD8ci1UFnIxGNWUrjHz6V6QhqNdQf6wAAAABJRU5ErkJggg==\') 0 0; }\n\
\n\
.ui-editor-link-button:hover .ui-icon-link {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-unlink-button .ui-icon-unlink {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAA2FBMVEX///8WFhYvLy9LS0sEBAQODg4EBARNTU0DAwNVVVVUVFQtLS1nZ2cfHx46OjoSEhLGxsZTU1OAgH/T09NUVFQEBAQ6OjpMTEwvLy+4uMDCwsEQEBCvr7sSEhIEBAR+foMqKixFRUUEBARDQ0MBAQEBAQG5ucQiIiICAgIODg7Z2dlAQEBMTEwsLCxGRkYAAABPT0/e3t4mJiYqKiopKSlUVFQiIiJJSUkjIyNFRUU5OTkBAQEoKCi/v8zCws+qgFWFZkY7MSbc3Nzj4+Pm5ubOztzU1OTQ0N6IE/7FAAAAQ3RSTlMAAAAAigAAAAAAZwB9gACP2zPF+F9ocjVu39xy40KAtpZlRQBrUPx9AIb8AE8AAAAA/AAAAAAAAAAAAAAA/PwAAAD8PWHlxQAAALtJREFUeF5dzsVWxEAQheHqpGPEPeMWGXfcmQHe/42oC+ewmH95F1UfGWFyhZLQUBHlTvBxOp92gZP/DaN25Esp/ag9ukeUxa5p6qbpxpmHqGgNOtWm6gxahaIokwX1ht16ps3q7rAn9utrg7RxX6Z6KvtjbWJZGHTuuLLtw8P2f/CAWd4uGYNBqCpj5s1NM2cMPd3xc2D4EDDkIWCmj1NgSEHAlGUJDAnEmOfPr+8XxtDr27sQwHDA0GU/2RcVwEV78WkAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-unlink-button:hover .ui-icon-unlink {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/* Dialog */\n\
.ui-editor-link-panel .ui-editor-link-menu {\n\
  height: 100%;\n\
  width: 200px;\n\
  float: left;\n\
  border-right: 1px dashed #D4D4D4;\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-orient: vertical;\n\
  -moz-box-orient: vertical;\n\
  -ms-box-orient: vertical;\n\
  box-orient: vertical; }\n\
  .ui-editor-link-panel .ui-editor-link-menu p {\n\
    font-weight: bold;\n\
    margin: 12px 0 8px; }\n\
  .ui-editor-link-panel .ui-editor-link-menu fieldset {\n\
    -webkit-box-flex: 2;\n\
    -moz-box-flex: 2;\n\
    -ms-box-flex: 2;\n\
    box-flex: 2;\n\
    margin: 2px 4px;\n\
    padding: 7px 4px;\n\
    font-size: 13px; }\n\
    .ui-editor-link-panel .ui-editor-link-menu fieldset label {\n\
      display: block;\n\
      margin-bottom: 10px; }\n\
      .ui-editor-link-panel .ui-editor-link-menu fieldset label span {\n\
        display: inline-block;\n\
        width: 150px;\n\
        font-size: 13px;\n\
        vertical-align: top; }\n\
\n\
.ui-editor-link-panel .ui-editor-link-menu fieldset,\n\
.ui-editor-link-panel .ui-editor-link-wrap fieldset {\n\
  border: none; }\n\
\n\
.ui-editor-link-panel .ui-editor-link-wrap {\n\
  margin-left: 200px;\n\
  padding-left: 20px;\n\
  min-height: 200px;\n\
  position: relative; }\n\
  .ui-editor-link-panel .ui-editor-link-wrap.ui-editor-link-loading:after {\n\
    content: \'Loading...\';\n\
    position: absolute;\n\
    top: 60px;\n\
    left: 200px;\n\
    padding-left: 20px;\n\
    background: url(\'data:image/png;base64,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\') no-repeat left center; }\n\
  .ui-editor-link-panel .ui-editor-link-wrap h2 {\n\
    margin: 10px 0 0; }\n\
  .ui-editor-link-panel .ui-editor-link-wrap fieldset {\n\
    margin: 2px 4px;\n\
    padding: 7px 4px;\n\
    font-size: 13px; }\n\
    .ui-editor-link-panel .ui-editor-link-wrap fieldset input[type=text] {\n\
      width: 400px; }\n\
    .ui-editor-link-panel .ui-editor-link-wrap fieldset.ui-editor-external-href {\n\
      width: 365px; }\n\
    .ui-editor-link-panel .ui-editor-link-wrap fieldset.ui-editor-link-email label {\n\
      display: inline-block;\n\
      width: 115px; }\n\
    .ui-editor-link-panel .ui-editor-link-wrap fieldset.ui-editor-link-email input {\n\
      width: 340px; }\n\
  .ui-editor-link-panel .ui-editor-link-wrap ol li {\n\
    list-style: decimal inside; }\n\
\n\
.ui-editor-link-panel .ui-editor-link-wrap\n\
.ui-editor-link-panel .ui-editor-link-wrap fieldset #ui-editor-link-external-target {\n\
  vertical-align: middle; }\n\
\n\
.ui-editor-link-error-message div {\n\
  padding: 0 .7em; }\n\
  .ui-editor-link-error-message div p {\n\
    margin: 0; }\n\
    .ui-editor-link-error-message div p .ui-icon {\n\
      margin-top: 2px;\n\
      float: left;\n\
      margin-right: 2px; }\n\
\n\
/**\n\
 * List plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-list-unordered-button .ui-icon-list-unordered {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAMlJREFUeNpi/P//PwNFAGQAIyNjGBCvgdIMxGKQXhaoORFlZWWBXV1dTED2KqjYGiBmRMJMaOwrQFwOc0EEEG+A0iS5gBFEMDExkeX9f//+MTAxUAhgBsQC8U4oTRKABWJ8Rkae84wZk5iB7MVQsW1IAYYLW8MCMRGID0Bp+gYiC46EhTPR4QrEdCA+A6VJT8pAcDMsLB3EuAniQP14BIiPAfEJID4FxGehqe8OED8B4vVgvVADioH4GZTGGWhYvUtpbqQ4JQIEGABjeFYu055ToAAAAABJRU5ErkJggg==\') 0 0; }\n\
\n\
.ui-editor-list-unordered-button:hover .ui-icon-list-unordered {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-list-ordered-button .ui-icon-list-ordered {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAM1JREFUeNpi/P//PwNFAGQAIyNjIxCvAWJBIGYgFoP0skDNqQfidUDMiGT2GigfhpnQ2FeAuJwFSQMTmuNCiPEBTFMblF1CahAwgvzBxMREVvj9+/cP7oIuIN4Bpcl2gRMQJwFxDFRuG1KAYcVAF1jDojEBiGcAsQSp0QjzgiEQawLxSiibNoGInmqRE9J0IJaEYnNSXAAzYC4QNwJxIJLcEbRAYwZidiDmgOLTYPVIzgJpPgD2F45Aw+olqAFrgfg5EBeTagAjpdkZIMAAg/ZGwsH5qkAAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-list-ordered-button:hover .ui-icon-list-ordered {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Paste plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 */\n\
.ui-editor-paste-panel-tabs {\n\
  height: 100%;\n\
  width: 100%;\n\
  -webkit-box-sizing: border-box;\n\
  -moz-box-sizing: border-box;\n\
  box-sizing: border-box; }\n\
\n\
.ui-editor-paste .ui-tabs a {\n\
  outline: none; }\n\
\n\
.ui-editor-paste-panel-tabs {\n\
  position: relative;\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-orient: vertical;\n\
  -moz-box-orient: vertical;\n\
  -ms-box-orient: vertical;\n\
  box-orient: vertical; }\n\
  .ui-editor-paste-panel-tabs .ui-editor-paste-synchronize-text {\n\
    height: 25px;\n\
    line-height: 25px;\n\
    position: absolute;\n\
    right: 0;\n\
    top: 0;\n\
    width: 100px; }\n\
    .ui-editor-paste-panel-tabs .ui-editor-paste-synchronize-text input {\n\
      margin: 0;\n\
      padding: 0;\n\
      vertical-align: text-bottom; }\n\
\n\
.ui-editor-paste-panel-tabs > div {\n\
  overflow: auto;\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-flex: 1;\n\
  -moz-box-flex: 1;\n\
  -ms-box-flex: 1;\n\
  box-flex: 1;\n\
  -webkit-box-orient: vertical;\n\
  -moz-box-orient: vertical;\n\
  -ms-box-orient: vertical;\n\
  box-orient: vertical;\n\
  -webkit-box-sizing: border-box;\n\
  -moz-box-sizing: border-box;\n\
  box-sizing: border-box; }\n\
\n\
.ui-editor-paste-panel-tabs > div > textarea.ui-editor-paste-area {\n\
  -webkit-box-flex: 1;\n\
  -moz-box-flex: 1;\n\
  -ms-box-flex: 1;\n\
  box-flex: 1;\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box; }\n\
\n\
/**\n\
 * Raptorize plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-raptorize-button .ui-icon-raptorize {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABDlBMVEX///9NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU0Y/iVtAAAAWXRSTlMA/v1mTvW+WQFF+nGpsyPlDhXL1GvZHduk48LslL2a7tadwee772kEfqD8+OGCXWJ2+bQ9pt7xCme4iQU4iNH0mCEPEd82Ocxj4De2HoMaq3MHZJsDeGwCG8H1fioAAAC1SURBVHheNchFlsMwEADRlmRkSDKmMDMMMjMz9P0vkifLrl194F3NW0qtugV5Wt1FHpnloGKRmr3TK96YDjiMxFGCONngcJ1De4GNDJqhvd2VkbzsY+eDw2efMTYsjRFxd4+DZx6ajC1xhXTTB560EyfWASJW2FEG3vGJElZOz4xzH6QLKLqMgpvbu3sxD+4jPBFJe05fBby9ly0S6ADxl4BviGjp5xd0Of0TUqaUEPs/kR1YA96IIUDtx93SAAAAAElFTkSuQmCC\') 0 0; }\n\
\n\
.ui-editor-raptorize-button:hover .ui-icon-raptorize {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Save plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-save-button .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAVNJREFUeNqkU71ugzAQPowtwdAdqRLK3odg6161a+cukZonoGrElgWWDqhb16oP0AfoytStirows0QRMj/unQsohAQi5aTD5vju4/Pd2VBKwTnG6cEYe8bl6s73P09Jel8ur3H5ruv6CUiBYRgfQRAosnrCyQhLOZTLG1ImpYQSA1VVjf7dNE0gLOV0R6AXlAMSk4uiGCUQ6ITdJzDpz0SQTxAoxlqVZo+gLEuQyDxFwIQAwg4IiPV3vYbL2WyUgDBHFbxG0Um9t237sIIkSeDYYGHbur3neQMCTgqoRWEYDToh8NyLxSO4rgtpmrY14D0CUsA5h80mh/n8QQdXq7CTTN/ILMtqa9AjEDjOGrTdSnAcRwdpr1unzB5BMweiGwY8tx/H8U+WZbmUSoPJlfr3NrZLgDkXujbNXaD9DfoLAt8OFRHPfb8X+sLcW+Pc6/wnwABHMdnKf4KT4gAAAABJRU5ErkJggg==\') 0 0; }\n\
\n\
.ui-editor-save-button:hover .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-cancel-button .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAtFBMVEX///+nAABhAACnAACjAACCAACgAACHAACjAAByAAB1AAByAACDAACnAACCAACHAACgAACNAACbAACXAACMAACSAABfAACYAACRAACjAACbAAChAACqAACNAACcAACHAACqAADEERGsERHQERG+NjaiERHUTEzYERG4ERGlFBSfFRX/d3f6cnK0JSWoHh7qYmLkXFyvFRXmXl7vZ2fNRUX4cHDXT0/+dnbbU1O3Li7GPT26MTG2f8oMAAAAIXRSTlMASEjMzADMzAAASMxIAMwAAMzMzEjMzEhISABIzABISEg/DPocAAAAj0lEQVR4Xo3PVw6DMBBF0RgXTO+hBYhtILX3sv99RRpvgPcxVzp/M5syb7lYepxDABDeYcQ5wg+MAMhr3JOyJKfxTABqduuvjD37O6sBwjZ+f76/7TFuQw1VnhyGYZPklYagKbKLlDIrmkBDGq1hUaqhM4UQJpwOwFdK+a4LAbCdlWNTCgGwjLlhUQqZ8uofSk8NKY1Fm8EAAAAASUVORK5CYII=\') 0 0; }\n\
\n\
.ui-editor-cancel-button:hover .ui-icon {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
/**\n\
 * Tag menu plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 */\n\
.ui-editor-wrapper .ui-editor-selectmenu .ui-editor-selectmenu-button .ui-icon {\n\
  text-align: left; }\n\
\n\
.ui-editor-wrapper .ui-editor-selectmenu .ui-editor-selectmenu-button .ui-editor-selectmenu-text {\n\
  font-size: 13px;\n\
  line-height: 22px; }\n\
\n\
.ui-editor-selectmenu-menu li a, .ui-editor-selectmenu-status {\n\
  line-height: 12px; }\n\
\n\
/**\n\
 * Basic text style plugin\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-wrapper [data-title]:after {\n\
  opacity: 0;\n\
  content: attr(data-title);\n\
  display: block;\n\
  position: absolute;\n\
  top: 100%;\n\
  font-size: 12px;\n\
  font-weight: normal;\n\
  color: white;\n\
  padding: 11px 16px 7px;\n\
  white-space: nowrap;\n\
  text-shadow: none;\n\
  overflow: visible;\n\
  z-index: 1000;\n\
  -webkit-pointer-events: none;\n\
  -moz-pointer-events: none;\n\
  pointer-events: none;\n\
  -webkit-border-radius: 9px 9px 2px 2px;\n\
  -moz-border-radius: 9px 9px 2px 2px;\n\
  -ms-border-radius: 9px 9px 2px 2px;\n\
  -o-border-radius: 9px 9px 2px 2px;\n\
  border-radius: 9px 9px 2px 2px;\n\
  -webkit-transition: opacity 0.23s;\n\
  -webkit-transition-delay: 0s;\n\
  -moz-transition: opacity 0.23s 0s;\n\
  -o-transition: opacity 0.23s 0s;\n\
  transition: opacity 0.23s 0s;\n\
  background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSI1cHgiIHN0b3AtY29sb3I9InJnYmEoNDAsIDQwLCA0MCwgMCkiLz48c3RvcCBvZmZzZXQ9IjZweCIgc3RvcC1jb2xvcj0iIzI4MjgyOCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzI4MjgyOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\'), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 10px 0;\n\
  background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(5px, rgba(40, 40, 40, 0)), color-stop(6px, #282828), color-stop(100%, #282828)), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 10px 0;\n\
  background: -webkit-linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 10px 0;\n\
  background: -moz-linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 10px 0;\n\
  background: -o-linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 10px 0;\n\
  background: linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 10px 0; }\n\
\n\
.ui-editor-wrapper [data-title]:hover:after {\n\
  opacity: 1; }\n\
\n\
.ui-editor-wrapper .ui-editor-select-element {\n\
  position: relative; }\n\
\n\
.ui-editor-wrapper .ui-editor-select-element:after {\n\
  background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSI1cHgiIHN0b3AtY29sb3I9InJnYmEoNDAsIDQwLCA0MCwgMCkiLz48c3RvcCBvZmZzZXQ9IjZweCIgc3RvcC1jb2xvcj0iIzI4MjgyOCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzI4MjgyOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\'), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 3px 0;\n\
  background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(5px, rgba(40, 40, 40, 0)), color-stop(6px, #282828), color-stop(100%, #282828)), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 3px 0;\n\
  background: -webkit-linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 3px 0;\n\
  background: -moz-linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 3px 0;\n\
  background: -o-linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 3px 0;\n\
  background: linear-gradient(rgba(40, 40, 40, 0) 5px, #282828 6px, #282828), url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAgMAAACKgJcSAAAADFBMVEUAAAAoKCgoKCgoKCj7f2xyAAAAA3RSTlMATLP00ibhAAAAJklEQVR4XgXAMRUAEBQF0GtSwK6KYrKpIIz5P4eBTcvSc808J/UBPj4IdoCAGiAAAAAASUVORK5CYII=\') no-repeat 3px 0; }\n\
\n\
/**\n\
 * Unsaved edit warning plugin\n\
 *\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-unsaved-edit-warning {\n\
  position: fixed;\n\
  bottom: 0;\n\
  right: 0;\n\
  height: 30px;\n\
  line-height: 30px;\n\
  border-radius: 5px 0 0 0;\n\
  border: 1px solid #D4D4D4;\n\
  padding-right: 7px;\n\
  background: url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjUwJSIgeTE9IjAlIiB4Mj0iNTAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmMiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2VkZWNiZCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiIC8+PC9zdmc+IA==\');\n\
  background: -webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #fffff2), color-stop(100%, #edecbd));\n\
  background: -webkit-linear-gradient(top, #fffff2, #edecbd);\n\
  background: -moz-linear-gradient(top, #fffff2, #edecbd);\n\
  background: -o-linear-gradient(top, #fffff2, #edecbd);\n\
  background: linear-gradient(top, #fffff2, #edecbd);\n\
  -webkit-transition: opacity 0.5s;\n\
  -moz-transition: opacity 0.5s;\n\
  -o-transition: opacity 0.5s;\n\
  transition: opacity 0.5s;\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=0);\n\
  opacity: 0; }\n\
  .ui-editor-unsaved-edit-warning .ui-icon {\n\
    display: inline-block;\n\
    float: left;\n\
    margin: 8px 5px 0 5px; }\n\
\n\
.ui-editor-unsaved-edit-warning-visible {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-unsaved-edit-warning-dirty {\n\
  outline: 1px dotted #aaa;\n\
  background-image: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoAQMAAAC2MCouAAAABlBMVEUAAACfn5/FQV4CAAAAAnRSTlMAG/z2BNQAAABPSURBVHhexc2xEYAgEAXRdQwILYFSKA1LsxRKIDRwOG8LMDb9++aO8tAvjps4qXMLaGNf5JglxyyEhWVBXpAfyCvyhrwjD74OySfy8dffFyMcWadc9txXAAAAAElFTkSuQmCC\') !important; }\n\
\n\
/**\n\
 * View source plugin\n\
 *\n\
 * @author Michael Robinson <michael@panmedia.co.nz>\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.ui-editor-view-source-button .ui-icon-view-source {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=85);\n\
  opacity: 0.85;\n\
  background: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAKtJREFUeNpi/P//PwMlgImBQkCxAQwgLzAyMqLjMCCehsSfBhVDUQf2PhYDIoB4JhCLIYmJQcUiCBkQBcRzgFgci6vEoXJRuAyIAeIFODQjG7IAqhbFAAMg3gOlGQhguFp0FyQC8UoglgTx0QFUjSRUTSKuMEgG4nUghVgMkITKJROKhXQg3gbUI42kXxokBpUjGI0gDYVAfBzJABC7EFs6YBz6eYFiAwACDAADJlDtLE22CAAAAABJRU5ErkJggg==\') 0 0; }\n\
\n\
.ui-editor-view-source-button:hover .ui-icon-view-source {\n\
  filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=100);\n\
  opacity: 1; }\n\
\n\
.ui-editor-ui-view-source .ui-editor-ui-view-source-dialog {\n\
  overflow: auto; }\n\
\n\
.ui-editor-ui-view-source-plain-text {\n\
  height: 100%;\n\
  width: 100%;\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-orient: vertical;\n\
  -moz-box-orient: vertical;\n\
  -ms-box-orient: vertical;\n\
  box-orient: vertical; }\n\
\n\
.ui-editor-ui-view-source-dialog textarea {\n\
  white-space: pre-line;\n\
  width: 100%;\n\
  height: 100%;\n\
  display: -webkit-box;\n\
  display: -moz-box;\n\
  display: -ms-box;\n\
  display: box;\n\
  -webkit-box-orient: vertical;\n\
  -moz-box-orient: vertical;\n\
  -ms-box-orient: vertical;\n\
  box-orient: vertical;\n\
  -webkit-box-flex: 1;\n\
  -moz-box-flex: 1;\n\
  -ms-box-flex: 1;\n\
  box-flex: 1;\n\
  -webkit-box-sizing: border-box;\n\
  -moz-box-sizing: border-box;\n\
  box-sizing: border-box; }\n\
\n\
/**\n\
 * Basic color picker plugin default colors.\n\
 *\n\
 * @author David Neilsen <david@panmedia.co.nz>\n\
 */\n\
.cms-white {\n\
  color: #ffffff; }\n\
\n\
.cms-black {\n\
  color: #000000; }\n\
\n\
.cms-blue {\n\
  color: #4f81bd; }\n\
\n\
.cms-red {\n\
  color: #c0504d; }\n\
\n\
.cms-green {\n\
  color: #9bbb59; }\n\
\n\
.cms-purple {\n\
  color: #8064a2; }\n\
\n\
.cms-orange {\n\
  color: #f79646; }\n\
\n\
.cms-grey {\n\
  color: #999; }\n\
</style>').appendTo('head');