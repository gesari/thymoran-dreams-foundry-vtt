import { prepareActiveEffectCategories } from '../helpers/effects.mjs';

const { api, sheets } = foundry.applications;
const DragDrop = foundry.applications.ux.DragDrop;

/**
 * Extend the basic ItemSheet with some simple modifications (for now)
 * @extends {ItemSheetV2}
 */
export class ThymoranDreamsItemSheet extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {
    constructor(options = {}) {
        super(options);
    }

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ['thymorandreams', 'item'],
        actions: {
            onEditImage: this._onEditImage,
            viewDoc: this._viewEffect,
            createDoc: this._createEffect,
            deleteDoc: this._deleteEffect,
            toggleEffect: this._toggleEffect,
        },
        form: {
            submitOnChange: true,
        },
        // Custom property merged into `this.options`
        dragDrop: [{ dragSelector: '.draggable', dropSelector: null }]
    };

    /* ------------------------------------------ */

    /** @override */
    static PARTS = {
        header: {
            template: 'systems/thymoran-dreams/templates/item/header.hbs',
        },
        tabs: {
            template: 'systems/thymoran-dreams/templates/tab-nav.hbs',
        },
        description: {
            template: 'systems/thymoran-dreams/templates/item/description.hbs',
        },
        feature: {
            template: 'systems/thymoran-dreams/templates/item/feature.hbs',
        },
        gear: {
            template: 'systems/thymoran-dreams/templates/item/gear.hbs',
        },
        skill: {
            template: 'systems/thymoran-dreams/templates/item/skill.hbs',
        },
        effects: {
            template: 'systems/thymoran-dreams/templates/item/effects.hbs',
        },
    };

    /** @override */
    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        // Not all parts always render
        options.parts = ['header', 'tabs', 'description'];
        // Don't show the other tabs if only limited view
        if (this.document.limited) return;
        // Control which parts show based on document subtype
        switch (this.document.type) {
            case 'feature':
                options.parts.push('feature', 'effects');
                break;
            case 'gear': 
                options.parts.push('gear');
                break;
            case 'skill':
                options.parts.push('skill');
                break;
        }
    }

    /* ----------------------------------------------- */

    /** @override */
    async _prepareContext(options) {
        const context = {
            // Validates both permissions and compendium status
            editable: this.isEditable,
            owner: this.document.isOwner,
            limited: this.document.limited,
            // Add the item document
            item: this.item,
            // Adding system and flags for easier access
            system: this.item.system,
            flags: this.item.flags,
            // Adding a pointer to CONFIG.THYMORANDREAMS
            config: CONFIG.THYMORANDREAMS,
            // You can factor out context construction to helper functions
            tabs: this._getTabs(options.parts),
            // Necessary for form Input and formFields helpers
            fields: this.document.schema.fields,
            systemFields: this.document.system.schema.fields,
        };

        return context;
    }

    /** @override */
    async _preparePartContext(partId, context) {
        switch (partId) {
            case 'feature':
            case 'gear':
            case 'spell':
                // Necessary for preserving active tab on re-render
                context.tab = context.tabs[partId];
                break;
            case 'description':
                context.tab = context.tabs[partId];
                // Enrich description info for display
                // Enrichment turns text like `[[/r 1d20]]` into buttons
                context.enrichedDescription = await TextEditor.enrichHTML(
                    this.item.system.description,
                    {
                        // Whether to shoiw secret blocks in finished HTML
                        secrets: this.document.isOwner,
                        // Data to fill in for inline rolls
                        rollData: this.item.getRollData(),
                        // Relative UUID resolution
                        relativeTo: this.item,
                    }
                );
                break;
            case 'effects':
                context.tab = context.tabs[partId];
                // Prepare active effects for easier access
                context.effects = prepareActiveEffectCategories(this.item.effects);
                break;
        }
        return context;
    }

    /**
     * Generates the data for the generic tab navigation template
     * @param {string[]} parts  An array of named template parts to render
     * @returns {Record<string, Partial<ApplicationTab>>}
     * @protected
     */
    _getTabs(parts) {
        // If you have sub-tabs this is necessary to change
        const tabGroup = 'primary';
        // Default tab for first time it's rendered this session
        if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = 'description';
        return parts.reduce((tabs, partId) => {
            const tab = {
                cssClass: '',
                group: tabGroup,
                // Matches tab property to
                id: '',
                // FontAwesome Icon, if you so choose
                icon: '',
                // Run through localization
                label: 'THYMORANDREAMS.Item.Tabs',
            };
            switch (partId) {
                case 'header':
                case 'tabs':
                    return tabs;
                case 'description':
                    tab.id = 'description';
                    tab.label += 'Description';
                    break;
                case 'feature':
                    tab.id = 'feature';
                    tab.label += 'feature';
                    break;
                case 'gear': 
                    tab.id = 'gear';
                    tab.label += 'gear';
                    break; 
                case 'skill': 
                    tab.id = 'skill';
                    tab.label += 'skill';
                    break;
                case 'effects': 
                    tab.id = 'effects';
                    tab.label += 'effects';
                    break;
            }
            if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active';
            tabs[partId] = tab;
            return tabs;
        }, {});
    }

    /**
     * Actions performed after any render of the Application
     * Post-Render steps are not awaited by the render process
     * @param {ApplicationRenderContext} context     Prepared context data
     * @param {RenderOptions} options                Provided render options
     * @protected
     */
    async _onRender(context, options) {
        await super._onRender(context, options);
        new DragDrop.implementation({
            dragSelector: ".draggable",
            dropSelector: null,
            permissions: {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this),
            },
            callbacks: {
                dragstart: this._onDragStart.bind(this),
                dragover: this._onDragOver.bind(this),
                drop: this._configureRenderOptions.bind(this),
            }
        }).bind(this.element);
        // May want to add other special handling here
        // Foundry comes with a large number of utility classes, e.g. SearchFilter
        // Research utility classes and implement here if necessary
    }

    /**
     * 
     * Actions
     * 
     */

    /**
     * Handle changing a document's image
     * @this ThymoranDreamsItemSheet 
     * @param {PointerEvent} event     The originating click event
     * @param {HTMLElement} target     The capturing HTML element which defined a [data-action]
     * @returns {Promise}
     * @protected
     */
    static async _onEditImage(event, target) {
        const attr = target.dataset.edit;
        const current = foundry.utils.getProperty(this.document, attr);
        const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ?? {};
        const fp = new FilePicker({
            current,
            type: 'image',
            redirecteToRoot: img ? [img] : [],
            callback: (path) => 
                { this.document.update({ [attr]: path}); }, 
                top: this.position.top + 40,
                left: this.position.left + 10,
        });
        return fp.browse();
    }

    /**
     * Renders an embedded document's sheet
     * @this ThymoranDreamsItemSheet
     * @param {PointerEvent} event     The originating click event
     * @param {HTMLElement} target     The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _viewEffect(event, target) {
        const effect = this._getEffect(target);
        effect.sheet.render(true);
    }

    /**
     * Handle item deletion
     * @this ThymoranDreamsItemSheet
     * @param {PointerEvent} event    The originating click event
     * @param {HTMLElement} target    The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _deleteEffect(event, target) {
        const effect = this._getEffect(target);
        await effect.delete();
    }

    /**
     * Handle creating a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML sheet
     * @this ThymoranDreamsItemSheet
     * @param {PointerEvent} event    The originating click event
     * @param {HTMLElement} target    The capturing HTML element which defined a [data-action]
     * @private
     */
    static async _createEffect(event, target) {
        // Retrieve the configured document class for ActiveEffect
        const aeCls = getDocumentClass('ActiveEffect');
        // Prepare the document creation data by initializing a default name
        // As of v12, you can define custom Active Effect subtypes just like Item subtypes if necessary
        const effectData = {
            name: aeCls.defaultName({
                // defaultName handles an undefined type gracefully
                type: target.dataset.type,
                parent: this.item,
            }),
        };
        // Loop thorugh the dataset and add it to our effectData
        for (const [dataKey, value] of Object.entries(target.dataset)) {
            // These data attributes are reserved for the action handling
            if (['action', 'documentClass'].includes(dataKey)) continue;
            // Nested properties require dot notation in HTML, e.g. anything with `system`
            // An example exists in spells.hbs, with `data-system.spell-level`
            // which turns into dataKey 'system.spellLevel'
            foundry.utils.setProperty(effectData, dataKey, value);
        }

        // Finally, create the embedded document!
        await aeCls.create(effectData, { parent: this.item });
    }

    /**
     * Determines the effect parent to pass to helper
     * @this ThymoranDreamsItemSheet
     * @param {PointerEvent} event     The originating click event
     * @param {HTMLElement} target     The capturing HTML element which defined a [data-action]
     * @private
     */
    static async _toggleEffect(event, target) {
        const effect = this._getEffect(target);
        await effect.update({ disabled: !effect.disabled });
    }

    /** Helper Functions */

    /**
     * Fetches the row with the data for the rendered embedded document
     * @param {HTMLElement} target     The element with the action
     * @returns {HTMLLIElement}        The document's row
     */
    _getEffect(target) {
        const li = target.closest('.effect');
        return this.item.effects.get(li?.dataset?.effectId);
    }

    /**
     * 
     * DragDrop
     * 
     */

    /**
     * Define whether a user is able to begin a dragstart workflow for a given drag selector
     * @param {string} selector     The candidate HTML selector for dragging
     * @returns {boolean}           Can the current user drag this selector?
     * @protected
     */
    _canDragStart(selector) {
        // game.user fetches the current user
        return this.isEditable;
    }

    /**
     * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
     * @param {string} selector    The candidate HTML selector for the drop target
     * @returns {boolean}          Can the current user drop on this selector?
     * @protected
     */
    _canDragDrop(selector) {
        // game.user fetches the current user
        return this.isEditable;
    }

    /**
     * Callback actions which occur at the beginning of a drag start workflow
     * @param {DragEvent} event     The originating DragEvent
     * @protected
     */
    _onDragStart(event) {
        const li = event.currentTarget;
        if ('link' in event.target.dataset) return;

        let dragData = null;

        // Active Effect
        if (li.dataset.effectId) {
            const effect = this.item.effects.get(li.dataset.effectId);
            dragData = effect.toDragData();
        }

        if (!dragData) return;

        // Set data transfer
        event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    }

    /** 
     * Callback actions which occur when a dragged element is dropped on a target.
     * @param {DragEvent} event      The originating DragEvent
     * @protected
     */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);
        const item = this.item;
        const allowed = Hooks.call('dropItemSheetData', item, this, data);
        if (allowed === false) return;

        // Although there is implementation for all doc types here, it is important to keep in mind that
        // only Active Effects are "valid" for items.
        // Actors have items, but items do not have actors.
        // Items within items is not implemented in Foundry by default.
        // If we need to add this functionality to TD, will need to search other systems / ask for guidance.
        // Basically all will use drag and drop, but will store the UUID of the item.
        // Folders can only contain Actors or Items. So, fall on the cases above.
        // Boilerplate code has left them here so we can have an idea of how it might work, 
        // in case we want to mess around with future implementations.
        switch (data.type) {
            case 'ActiveEffect':
                return this._onDropActiveEffect(event, data);
            case 'Actor':
                return this._onDropActor(event, data);
            case 'Item':
                return this._onDropItem(event, data);
            case 'Folder':
                return this._onDropFolder(event, data);
        }
    }

    /* -------------------------------------------- */

    /**
     * Handle the dropping of ActiveEffect data on to an Actor Sheet
     * @param {DragEvent} event                       The concluding DragEvent which contains drop data
     * @param {Object} data                           The data transfer extracted from the event
     * @returns {Promise<ActiveEffect|boolean>}       The created ActiveEffect object or false if it couldn't be created
     * @protected
     */
    async _onDropActiveEffect(event, data) {
        const aeCls = getDocumentClass('ActiveEffect');
        const effect = await aeCls.fromDropData(data);
        if (!this.item.isOwner || !effect) return false;

        if (this.item.uuid === effect.parent?.uuid) {
            return this._onEffectSort(event, effect);
        }
        return aeCls.create(effect, { parent: this.item });
    }

    /**
     * Sort an ActiveEffect based on its surrounding attributes
     * @param {DragEvent} event
     * @param {ActiveEffect} effect
     */
    _onEffectSort(event, effect) {
        const effects = this.item.effects;
        const dropTarget = event.target.closest('[data-effect-id]');
        if (!dropTarget) return;
        const target = effects.get(dropTarget.dataset.effectId);

        // Don't sort on yourself
        if (effect.id === target.id) return;

        // Identify sibling items based on adjacent HTML elements
        const siblings = [];
        for (let el of dropTarget.parentElement.children) {
            const siblingId = el.dataset.effectId;
            if (siblingId && siblingId !== effect.id){
                siblings.push(effects.get(el.dataset.effectId));
            }
        }

        // Perform the sort
        const sortUpdates = SortingHelpers.performIntegerSort(effect, { target, siblings });
        const updateData = sortUpdates.map((u) => {
            const update = u.update;
            update._id = u.target._id;
            return update;
        });

        // Perform the update
        return this.item.updateEmbeddedDocuments('ActiveEffect', updateData);
    }

    /* -------------------------------------------- */

    /**
     * Handle dropping of an Actor data onto another Actor sheet
     * @param {DragEvent} event            The concluding DragEvent which contains drop data
     * @param {object} data                The data transfer extracted from the event
     * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was not permitted.
     * @protected
     */
    async _onDropActor(event, data) {
        if (!this.item.isOwner) return false;
    }

    /* -------------------------------------------- */

    /**
     * Handle dropping of an Item reference or item data onto an Actor sheet
     * @param {DragEvent} event            The concluding DragEvent which contains drop data
     * @param {Object} data                The data transfer extracted from the event
     * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted
     * @protected
     */
    async _onDropItem(event, data) {
        if (!this.item.isOwner) return false;
    }

    /* -------------------------------------------- */

    /**
     * Handle dropping of a Folder on an Actor Sheet
     * The core sheet currently supports dropping a Folder of Items to create all items as owned items
     * @param {DragEvent} event     The concluding DragEvent which contains drop data
     * @param {Object} data         The data transfer extracted from the event
     * @returns {Promise<Item[]>} 
     * @protected
     */
    async _onDropFolder(event, data) {
        if (!this.item.isOwner) return [];
    }
}