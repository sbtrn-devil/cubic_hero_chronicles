// helpers for inventory management

const InventoryHelpers = {
	// returns item ID selected by the user, or null if none
	async showInventory(s, {
		gs,
		tmps,
		st,
		forUse
	}) {
		var invUITitle = forUse ? "@inv_what_use:Что решил использовать герой?"
			: "@inv_hero_has:В котомке у героя:";
		var invUIItems = new Array(),
			itemWasSelected = false;

		// prepare held item slots
		for (var itemId of gs.inventory) {
			var invItem = ResInventoryItems[itemId];
			if (!invItem) {
				continue;
			}

			invUIItems.push({
				text: invItem.name,
				enabled: true,
				leftText: forUse || invItem.alwaysUse ?
					UIText.SK_USE : UIText.SK_DROP,
				entLeftEvtTarget: s.ent,
				leftEvtType: "inventory$select",
				leftEvtData: {
					itemId: itemId,
					use: forUse || invItem.alwaysUse
				},
				rightText: UIText.SK_EXAMINE,
				entRightEvtTarget: s.ent,
				rightEvtType: "inventory$examine",
				rightEvtData: {
					itemId: itemId
				},
				selected: tmps.inv_last_selected == itemId
			});
			itemWasSelected |= (tmps.inv_last_selected == itemId);
		}

		// prepare empty places slots
		var maxItems = gs.f_backpack_collected ?
			GameConst.INVENTORY_SIZE_EXPANDED :
			GameConst.INVENTORY_SIZE_DEFAULT;
		for (var i = gs.inventory.length; i < maxItems; i++) {
			invUIItems.push({
				text: "@inv_empty:- пусто -",
				enabled: false
			});
		}

		// prepare footer with inventory closer
		invUIItems.push("hr");
		invUIItems.push({
			text: "@inv_do_nothing:Так точно",
			enabled: true,
			leftText: "@inv_close:Закрыть котомку",
			entLeftEvtTarget: s.ent,
			leftEvtType: "inventory$close",
			leftEvtData: { },
			selected: !itemWasSelected
		});

		entUI.comUI.showMenuSync({
			title: invUITitle,
			items: invUIItems
		});
		entApp.comScene.comGameFixedTicks.enabled = false;

		try {
			for (;;) {
				var [
					evtSelect,
					evtExamine,
					evtClose
				] = await s.anyOf(
					s.ent.event("inventory$select"),
					s.ent.event("inventory$examine"),
					s.ent.event("inventory$close")
				);

				if (evtClose) {
					return null;
				}

				if (evtSelect) {
					return {
						itemId: evtSelect.itemId,
						use: evtSelect.use
					};
				}

				if (evtExamine) {
					await st.examinePopup(s, {
						// if we get to this point, this item ID is guaranteed
						// to be valid
						id: ResInventoryItems[evtExamine.itemId].examHintId
					});
					entApp.comScene.comGameFixedTicks.enabled = false;
					continue;
				}
			}
		} finally {
			entUI.comUI.hideMenuSync();
			entApp.comScene.comGameFixedTicks.enabled = true;
		}
	}
};
