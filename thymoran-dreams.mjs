// Import document classes
import { ThymoranDreamsActor } from './modules/documents/actor.mjs';
import { ThymoranDreamsItem } from './modules/documents/item.mjs';

// Import sheet classes
import { ThymoranDreamsActorSheet } from './modules/sheets/actor-sheet.mjs';
import { ThymoranDreamsItemSheet } from './modules/sheets/item-sheet.mjs';

// Import helper/utility classes/constants
import { THYMORANDREAMS } from './modules/helpers/config.mjs';


// Import DataModel classes
import * as models from './modules/data/_module.mjs';

const collections = foundry.documents.collections;
const sheets = foundry.appv1.sheets;


/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

// Add key classes to global scope so they can be more easily used
// by downstream devs
globalThis.thymorandreams = {
    documents: {
        ThymoranDreamsActor,
        ThymoranDreamsItem
    },
    applications: {
        ThymoranDreamsActorSheet,
        ThymoranDreamsItemSheet
    },
    utils: {
        rollItemMacro,
    },
    models,
};

Hooks.once('init', function () {
    // Add custom constants for config
    CONFIG.THYMORANDREAMS = THYMORANDREAMS;

   /**
   * Set an initiative formula for the system
   * @type {String}
   */
    CONFIG.Combat.initiative = {
        formula: '1d20', // Will need to add in variable later, point to highest primary stat
        // decimals: 2, <-- This was included in boilerplate, but unsure if necessary. commenting out to see if anything breaks
    }

    // Define custom Document and DataModel classes
    CONFIG.Actor.documentClass = ThymoranDreamsActor;

    // Note that you don't need to declare a DataModel
    // for the base actor/item classes - they are included
    // with the Character/NPC as part of super.defineSchema()
    CONFIG.Actor.dataModels = {
        character: models.ThymoranDreamsCharacter,
        npc: models.ThymoranDreamsNPC,
    };
    CONFIG.Item.documentClass = ThymoranDreamsItem;
    CONFIG.Item.dataModels = {
        gear: models.ThymoranDreamsGear,
        feature: models.ThymoranDreamsFeature,
        spell: models.ThymoranDreamsSpell,
    };

    // Active Effects are never copied to the Actor,
    // but will still apply to the Actor from within the Item
    // if the transfer property on the Active Effect is true.
    CONFIG.ActiveEffect.legacyTransferral = false;

    // Register sheet application classes
    collections.Actors.unregisterSheet('core', sheets.ActorSheet);
    collections.Actors.registerSheet('thymorandreams', ThymoranDreamsActorSheet, {
        makeDefault: true,
        label: 'THYMORANDREAMS.SheetLabels.Actor',
    });

    collections.Items.unregisterSheet('core', sheets.ItemSheet);
    collections.Items.registerSheet('thymorandreams', ThymoranDreamsItemSheet, {
        madeDefault: true,
        label: 'THYMORANDREAMS.SheetLabels.Item',
    });
});


/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// Placeholder space to account for future Handlebars helpers to be placed
// Example helper
Handlebars.registerHelper('toLowerCase', function (str) {
    return str.toLowerCase();
});


/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
    // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
    Hooks.on('hotbarDrop', (bar, data, slot) => createDocMacro(data, slot));
});


/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

// NOTE TO SELF: Still figuring out how all this interacts specifically
// Copied from boilerplate code for now, will test functionality as time goes on

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function creatDocMacro(data, slot) {
    // First, determine if this is a valid owned item
    if (data.type !== 'Item') return;
    if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
        return ui.notifications.warn(
            'You can only create macro buttons for owned items.'
        );
    }
    // If it is, retrieve item based on uuid
    const item = await Item.fromDropData(data);

    //Create the macro command using uuid
    const command = `game.thymorandreams.rollItemMacro("${data.uuid}");`;
    let macro = game.macros.find(
        (m) => m.name === item.name && m.command === command
    );
    if (!macro) {
        macro = await Macro.create({
            name: item.name,
            type: 'script',
            img: item.img,
            command: command,
            flags: { 'thymorandreams.itemMacro': true },
        });
    }
    game.user.assignHotbarMacrio(macro, slot);
    return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
    // Reconstruct the drop data so we can load the item
    const dropData = {
        type: 'Item',
        uuid: itemUuid,
    };
    // Load the item from the uuid
    Item.fromDropData(dropData).then((item) => {
        // Determine if the item loaded and if it's an owned item
        if (!item || !item.parent) {
            const itemName = item?.name ?? itemUuid;
            return ui.notifications.warn(
                `Could not find ${itemName}. You may need to delete and recreate this macro.`
            );
        }

        // Trigger the item roll
        item.roll();
    });
}