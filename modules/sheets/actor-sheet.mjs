import { prepareActiveEffectCategories } from '../helpers/effects.mjs';

const { api, sheets } = foundry.applications;

// Extend the basic actor sheet, minor modifications for now
// Initial implementation based on boilerplate v13
export class ThymoranDreamsActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ['thymorandreams', 'actor'],
        position: {
            width: 800,
            height: 700,
        },
        actions: {
            onEditImage: this._onEditImage,
            viewDoc: this._viewDoc,
            createDoc: this._createDoc,
            deleteDoc: this._deleteDoc,
            toggleEffect: this._toggleEffect,
            roll: this._onRoll,
        },
        form: {
            submitOnChange: true,
        },
    };

    /** @override */
    static PARTS = {
        header: {
            template: 'systems/thymoran-dreams/templates/actor/header.hbs',
        },
        tabs: {
            // Boilerplate uses Foundry-provided template, can copy from templates/generic/tab-navigation.hbs
            template: 'systems/thymoran-dreams/templates/actor/tab-nav.hbs',
        },
        primary: {
            // stats tab with modifiers and buttons for applicable standard actions (boost, counter, free-cast, recharge, stabilize)
            template: 'systems/thymoran-dreams/templates/actor/primary.hbs',
            scrollable: [""],
        },
        attributes: {
            // attributes tab, mostly editable text fields? unclear if attunement will go here or header
            template: 'systems/thymoran-dreams/templates/actor/attributes.hbs',
            scrollable: [""],
        },
        skills: {
            // skills gained from style, specialization, and spell architectures
            template: 'systems/thymoran-dreams/templates/actor/skills.hbs',
            scrollable: [""],
        },
        loadout: {
            // config options for items and activation; also unitool setup / storage
            template: 'systems/thymoran-dreams/templates/actor/loadout.hbs',
            scrollable: [""],
        },
        config: {
            // config tab for managing leveling up / skill allocation
            template: 'systems/thymoran-dreams/templates/actor/config.hbs',
        },
    };

    /** @override */
    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        // Not all parts always render
        options.parts = ['header', 'tabs', 'primary'];
        // Don't show other tabs if only limited view
        if (this.document.limited) return;
        // Control which parts show based on doc subtype
        switch (this.document.type) {
            case 'player':
                options.parts.push('attributes', 'skills', 'loadout', 'config');
                break;
            case 'npc':
                options.parts.push('skills', 'loadout', 'config');
                break;
        }
    }

    /* ----------------------------------------------------- */

    /** @override */
    async _prepareContext(options) {
        // Output initialization
        const context = {
            // Validates both permissions and compendium status
            editable: this.isEditable,
            owner: this.document.isOwner,
            limited: this.document.limited,
            // Add the actor document
            actor: this.actor,
            // Add the actor's data to context.data for easier access, as well as flags
            system: this.actor.system,
            flags: this.actor.flags,
            // Adding a pointer to CONFIG.THYMORANDREAMS
            config: CONFIG.THYMORANDREAMS,
            tabs: this._getTabs(options.parts),
            // Necessary for formInput and formFields helpers
            fields: this.document.schema.fields,
            systemFields: this.document.system.schema.fields,
        };

        // Offloading context prep to a helper function
        this._prepareItems(context);

        return context;
    }

    /** @override */
    async _preparePartContext(partId, context) {
        switch (partId) {
            case 'primary':
                context.tab = context.tabs[partId];
                break;
            case 'attributes':
                // Adapted from boilerplates biography class, may need tuning
                context.tab = context.tabs[partId];
                // Enrich info for display
                // Turns text like `[[/r 1d20]]` into buttons
                context.enrichedAttributes = await TextEditor.enrichHTML(
                    this.actor.system.attributes,
                    {
                        // Whether to show secret blocks in the finished html
                        secrest: this.document.isOwner,
                        // Data to fill in for inline rolls
                        rollData: this.actor.getRollData(),
                        // Relative UUID resolution
                        relativeTo: this.actor,
                    }
                );
                break;
            case 'skills':
                context.tab = context.tabs[partId];
                break;
            case 'loadout':
                // Adapted from boilerplate effects class, may need tuning
                context.tab = context.tabs[partId];
                // Prepare active effects
                context.effects = prepareActiveEffectCategories(
                    // A generator that returns all effects stored on the actors and any items
                    this.actor.allApplicableEffects()
                );
                break;
            case 'config':
                context.tab = context.tabs[partId];
                break;
        }
        return context;
    }

    /**
     * Generate data for generic tab nav template
     * @param {string[]}
     * @returns {Record<string, Partial<ApplicationTab>>}
     * @protected
     */
    _getTabs(parts) {
        // If we add sub-tabs this is necessary to change
        const tabGroup = 'primary';
        // Default tab for the first time it's registered this session
        if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = 'primary';
        return parts.reduce((tabs, partId) => {
            const tab = {
                cssClass: '',
                group: tabGroup,
                // Matches tab property to
                id: '',
                // FontAwesome Icon, if we choose
                icon: '',
                // Run through localization
                label: 'THYMORANDREAMS.Actor.Tabs.',
            };
            switch (partId) {
                case 'header':
                case 'tabs':
                    return tabs;
                case 'primary':
                    tab.id = 'primary';
                    tab.label += 'Primary';
                    break;
                case 'attributes':
                    tab.id = 'attributes';
                    tab.label += 'Attributes';
                    break;
                case 'skills':
                    tab.id = 'skills';
                    tab.label += 'Skills';
                    break;
                case 'loadout':
                    tab.id = 'loadout';
                    tab.label += 'Loadout';
                    break;
                case 'config':
                    tab.id = 'config';
                    tab.label += 'Config';
                    break;
            }
            if (this.tabGroups[tabGroup] == tab.id) tab.cssClass = 'active';
            tabs[partId] = tab;
            return tabs;
        }, {});
    }

    /**
     * Organize and classify Items for Actor sheets
     * @param {object} context The context object to mutate
     */
    _prepareItems(context) {
        // Initialize containers
        // Implemented differently in boilerplate
        // Attempting more basic implementation based on commented suggestions in boilerplate since TD does not separate spells like d&d
        const attributes = [];
        const skills = [];
        const loadout = [];
        const config = [];

        // Iterate through items, allocate to containers
        for (let i of this.document.items) {
            // Append to attributes
            if (i.type === 'attribute') {
                attributes.push(i);
            }
            // Append to skills
            else if (i.type === 'skill') {
                skills.push(i);
            }
            // Append to loadout
            else if (i.type === 'loadout') {
                loadout.push(i);
            }
            // Append to config
            else if (i.type === 'config') {
                config.push(i);
            }
        }

        // Sort then assign
        context.attributes = attributes.sort((a,b) => (a.sort || 0) - (b.sort || 0));
        context.skills = skills.sort((a,b) => (a.sort || 0) - (b.sort || 0));
        context.loadout = loadout.sort((a,b) => (a.sort || 0) - (b.sort || 0));
        context.config = config.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }

    /**
     * Actions performed after any render of the App
     * Post-render steps are not awaited by render process
     * @param {ApplicationRenderContext} context  Prepared Context data
     * @param {RenderOptions} options             Provided render options
     * @protected
     * @override
     */
    async _onRender(context, options) {
        await super._onRender(context, options);
        this.#disableOverrides();
        // Can add other special handling here
        // Foundry comes with a large amount of utility classes, e.g. SearchFilter
        // May want to look into this
    }

    /**
     * 
     * ACTIONS
     * 
     */

    /**
     * Handle changing document image
     * @this ThymoranDreamsActorSheet
     * @param {PointerEvent} event    The originating click event
     * @param {HTMLElement} target    The capturing HTML element which defined a [data-action]
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
            redirectToRoot: img ? [img] : [],
            callback: (path) => {
                this.document.update({ [attr]: path });
            },
            top: this.position.top + 40,
            left: this.position.left + 10,
        });
        return fp.browse();
    }

    /**
     * Renders an embedded document's sheet
     * @this ThymoranDreamsActorSheet
     * @param {PointerEvent} event    The originating click event
     * @param {HTMLElement} target    The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _viewDoc(event, target) {
        const doc = this._getEmbeddedDocument(target);
        doc.sheet.render(true);
    }

    /**
     * Handles item deletion
     * @this ThymoranDreamsActorSheet
     * @param {PointerEvent} event   The originating click event
     * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _deleteDoc(event, target) {
        const doc = this._getEmbeddedDocument(target);
        await doc.delete();
    }

    /**
     * Handles creating a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset
     * @this ThymoranDreamsActorSheet
     * @param {PointerEvent} event   The originating click event
     * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
     * @private
     */
    static async _createDoc(event, target) {
        // Retrieve the configured document class for Item or ActiveEffect
        const docCls = getDocumentClass(target.dataset.documentClass);
        // Prepare the document creation data by initializing it a default name
        const docData = {
            name: docCls.defaultName({
                // defaultName handles an undefined type gracefully
                type: target.dataset.type,
                parent: this.actor,
            }),
        };
        // Loop through the dataset and add it to our docData
        for (const [dataKey, value] of Object.entries(target.dataset)) {
            // These data attributes are reserved for the action handling
            if (['action', 'documentClass'].includes(dataKey)) continue;
            // Nested properties require dot notation in the HTML, e.g. anything with `system`
            // An example exists in boilerplate spells.hbs, with `data-system.spell-level`
            // which turns into the dataKey 'system.spellLevel'
            foundry.utils.setProperty(docData, dataKey, value);
        }
        // Finally, create the embedded document!
        await docCls.create(docData, { parent: this.actor });
    }

    /**
     * Dtermines effect parent to pass to helper
     * @this ThymoranDreamsActorSheet
     * @param {PointerEvent} event    The originating click event
     * @param {HTMLElement} target    The capturing HTML element which defined a [data-action]
     * @private
     */
    static async _toggleEffect(event, target) {
        const effect = this._getEmbeddedDocument(target);
        await effect.update({ disabled: !effect.disabled });
    }

    /**
     * Handle clickable rolls
     * @this ThymoranDreamsActorSheet
     * @param {PointerEvent} event    The originating click event
     * @param {HTMLElement} target    The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _onRoll(event, target) {
        event.preventDefault();
        const dataset = target.dataset;

        // Handle item rolls
        switch (dataset.rollType) {
            case 'item':
                const item = this._getEmbeddedDocument(target);
                if (item) return item.roll();
        }

        // Handle rolls that supply the forumla directly
        if (dataset.roll) {
            let label = dataset.label ? `[ability] ${dataset.label}` : '';
            let roll = new Roll(dataset.roll, this.actor.getRollData());
            await roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: label,
                rollMode: game.settings.get('core', 'rollMode'),
            });
            return roll;
        }
    }

    /** Helper Functions */

    /**
     * Fetches the embedded document representing the containing HTML element
     * @param {HTMLElement} target    The element subject to search
     * @returns {Item | ActiveEffect} The embedded Item or ActiveEffect 
     */
    _getEmbeddedDocument(target) {
        const docRow = target.closest('li[data-document-class]');
        if (docRow.dataset.documentClass === 'Item') {
            return this.actor.items.get(docRow.dataset.itemId);
        } else if (docRow.dataset.documentClass === 'ActiveEffect') {
            const parent = docRow.dataset.parentId === this.actor.id ? this.actor : this.actor.items.get(docRow?.dataset.parentId);
            return parent.effects.get(docRow?.dataset.effectId);
        } else return console.warn('Could not find document class');
    }

    /** 
     * 
     * Drag and Drop
     * 
     */

    /**
     * Handle the dropping of ActiveEffect data onto an Actor Sheet
     * @param {DragEvent} event                   The concluding DragEvent which contains drop data
     * @param {object} data                       The data transfer from the event
     * @returns {Promise<ActiveEffect|boolean>}   The created ActiveEffect object or false if it couldn't be created
     * @protected
     */
    async _onDropActiveEffect(event, data) {
        const aeCls = getDocumentClasse('ActiveEffect');
        const effect = await aeCls.fromDropData(data);
        if (!this.actor.isOwner || !effect) return false;
        if (effect.target === this.actor) return this._onSortActiveEffect(event, effect);
        return aeCls.create(effect, { parent: this.actor });
    }

    /**
     * Handle a drop event for an existing embedded Active Effect to sort that ActiveEffect relative to its siblings
     * @param {DragEvent} event
     * @param {ActiveEffect} effect
     */
    async _onSortActiveEffect(event, effect) {
        /** @type {HTMLElement} */
        const dropTarget = event.target.closest('[data-effect-id]');
        if (!dropTarget) return;
        const target = this._getEmbeddedDocument(dropTarget);

        // Don't sort on yourself
        if (effect.uuid === target.uuid) return;

        // Identify sibling items based on adjacent HTML elements
        const siblings = [];
        for (const el of dropTarget.parentElement.children) {
            const siblingId = el.dataset.effectId;
            const parentId = el.dataset.parentId;
            if (siblingId && parentId && (siblingId !== effect.id || parentId !== effect.parent.id)) {
                siblings.push(this._getEmbeddedDocument(el));
            }
        }

        // Perform the sort
        const sortUpdates = SortingHelpers.performIntegerSort(effect, {target, siblings});

        // Split the updates by parent document
        const directUpdates = [];

        const grandchildUpdateData = sortUpdates.reduce((items, u) => {
            const parentId = u.target.parent.id;
            const update = { _id: u.target.id, ...u.update };
            if (parentId === this.actor.id) {
                directUpdates.push(update);
                return items;
            }
            if (items[parentId]) items[parentId].push(update);
            else items[parentId] = [update];
            return items;
        }, {});

        // Effects-on-items updates
        for (const [itemId, updates] of Object.entries(grandchildUpdateData)) {
            await this.actor.items.get(itemId).updateEmbeddedDocuments('ActiveEffect', updates);
        }

        // Update on main actor
        return this.actor.updateEmbeddedDocuments('ActiveEffect', directUpdates);
    }

    /**
     * Handle dropping of Actor data onto another Actor sheet
     * @param {DragEvent} event                  The concluding DragEvent which contains drop data
     * @param {object} data                      The data transfer extracted from the event
     * @returns {Promise<object|boolean>}        A data object which describes the result of the drop, or false if drop was not permitted
     * @protected
     */
    async _onDropActor(event, data) {
        if (!this.actor.isOwner) return false;
    }

    /* -------------------------------------- */

    /**
     * Handle dropping of a Folder on an Actor Sheet
     * The core sheet currently supports dropping a Folder of Items to create all items as owned items
     * @param {DragEvent} event     The concluding DragEvent which contains drop data
     * @param {object} data         The data transfer extracted from the event
     * @returns {Promsise<Item[]>}
     * @protected
     */
    async _onDropFolder(event, data) {
        if (!this.actor.isOwner) return [];
        const folder = await Folder.implementation.fromDropData(data);
        if (folder.type !== 'Item') return [];
        const droppedItemData = await Promise.all(
            folder.contents.map(async (item) => {
                if (!(document instanceof Item)) item = await fromUuid(item.uuid);
                return item;
            })
        );
        return this._onDropItemCreate(droppedItemData, event);
    }

    /**
     * Handle the final creation of dropped Item data on the Actor
     * This method is factored out to allow downstream classes the opportunity to override item creation behavior
     * @param {object[]|object} itemData     The item data requested for creation
     * @param {DragEvent} event              The concluding DragEvent which provided the drop data
     * @returns {Promise<Item[]>}
     * @private
     */
    async _onDropItemCreate(itemData, event) {
        itemData = itemData instanceof Array ? itemData : [itemData];
        return this.actor.createEmbeddedDocuments('Item', itemData);
    }


    /**
     * 
     * Actor Override Handling
     * 
     */

    /** 
     * Submit a document update based on the processed form data
     * @param {SubmitEvent} event      The originating form submission event
     * @param {HTMLFormElement} form   The form element that was submitted
     * @param {object} submitData      Processed and validated form data to be used for a document update
     * @returns {Promise<void>}
     * @protected
     * @override
     */
    async _processSubmitData(event, form, submitData) {
        const overrides = foundry.utils.flattenObject(this.actor.overrides);
        for (let k of Object.keys(overrides)) delete submitData[k];
        await this.document.update(submitData);
    }

    /**
     * Disable inputs subject to active effects
     */
    #disableOverrides() {
        const flatOverrides = foundry.utils.flattenObject(this.actor.overrides);
        for (const override of Object.keys(flatOverrides)) {
            const input = this.element.querySelector(`[name="${override}"]`);
            if (input) {
                input.disabled = true;
            }
        }
    }
}