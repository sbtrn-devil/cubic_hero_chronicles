//#include l13_specs_map_items.js

// specs for inventory items

// item ID (matches scene ID and name of the item flag in the inventory) => ...
// mapTypeId refers to "map object ID" as per ResMapItemFactory
const ResInventoryItems = {
	"it_yad": {
		hotspotId: "hs_it_yad",
		mapTypeId: "dt_item_yad",
		alwaysUse: true,
		name: "@it_yad:������ � �����",
		examHintId: "ex_it_yad"
	},
	"it_pistol": {
		hotspotId: "hs_it_pistol",
		mapTypeId: "dt_item_pistol",
		alwaysUse: false,
		name: "@it_pistol:��������",
		examHintId: "ex_it_pistol"
	},
	"it_iron_1": {
		hotspotId: "hs_it_iron_1",
		mapTypeId: "dt_item_iron",
		alwaysUse: false,
		name: "@it_iron_1:���� �1",
		examHintId: "ex_it_iron"
	},
	"it_iron_2": {
		hotspotId: "hs_it_iron_2",
		mapTypeId: "dt_item_iron",
		alwaysUse: false,
		name: "@it_iron_2:���� �2",
		examHintId: "ex_it_iron"
	},
	"it_fish": {
		hotspotId: "hs_it_fish",
		mapTypeId: "dt_item_fish",
		alwaysUse: false,
		name: "@it_fish:����� ����",
		examHintId: "ex_it_fish"
	},
	"it_grenade": {
		hotspotId: "hs_it_grenade",
		mapTypeId: "dt_item_grenade",
		alwaysUse: false,
		name: "@it_grenade:�������",
		examHintId: "ex_it_grenade"
	},
	"it_mk152": {
		hotspotId: "hs_it_mk152",
		mapTypeId: "dt_item_mk152",
		alwaysUse: false,
		name: "@it_mk152:���� ��-152�",
		examHintId: "ex_it_mk152"
	},
	"it_turban": {
		hotspotId: "hs_it_turban",
		mapTypeId: "dt_item_turban",
		alwaysUse: false,
		name: "@it_turban:�������������� ������",
		examHintId: "ex_it_turban"
	},
	"it_rake": {
		hotspotId: "hs_it_rake",
		mapTypeId: "dt_item_rake",
		alwaysUse: false,
		name: "@it_rake:������",
		examHintId: "ex_it_rake"
	},
	"it_detector": {
		hotspotId: "hs_it_detector",
		mapTypeId: "dt_item_detector",
		alwaysUse: false,
		name: "@it_detector:�������� ������ ����",
		examHintId: "ex_it_detector"
	},
	"it_scanner": {
		hotspotId: "hs_it_scanner",
		mapTypeId: "dt_item_scanner",
		alwaysUse: false,
		name: "@it_scanner:������������ �������",
		examHintId: "ex_it_scanner"
	},
	"it_elixir": {
		hotspotId: "hs_it_elixir",
		mapTypeId: "dt_item_elixir",
		alwaysUse: false,
		name: "@it_elixir:������� ��� �������� �������� (0.5 �)",
		examHintId: "ex_it_elixir"
	},
	"it_bottle": {
		hotspotId: "hs_it_bottle",
		mapTypeId: "dt_item_bottle",
		alwaysUse: false,
		name: "@it_bottle:������ ������� (0.5 �)",
		examHintId: "ex_it_bottle"
	},
	"it_vodka": {
		hotspotId: "hs_it_vodka",
		mapTypeId: "dt_item_vodka",
		alwaysUse: false,
		name: "@it_vodka:����� (0.5 �)",
		examHintId: "ex_it_vodka"
	},
	"it_explosive_vodka": {
		hotspotId: "hs_it_explosive_vodka",
		mapTypeId: "dt_item_explosive_vodka",
		alwaysUse: false,
		name: "@it_vodka:�������������� ����� (0.5 �)",
		examHintId: "ex_it_explosive_vodka"
	},
	"it_balalaika": {
		hotspotId: "hs_it_balalaika",
		mapTypeId: "dt_item_balalaika",
		alwaysUse: false,
		name: "@it_balalika:���������",
		examHintId: "ex_it_balalaika"
	},
	"it_hren": {
		hotspotId: "hs_it_hren",
		mapTypeId: "dt_item_hren",
		alwaysUse: false,
		name: "@it_hren:������� � ������� ������ �����",
		examHintId: "ex_it_hren"
	},
	"it_ski": {
		hotspotId: "hs_it_ski",
		mapTypeId: "dt_item_ski",
		alwaysUse: false,
		name: "@it_ski:�������������� ������ ����",
		examHintId: "ex_it_ski"
	},
	"it_valenok": {
		hotspotId: "hs_it_valenok",
		mapTypeId: "dt_item_valenok",
		alwaysUse: false,
		name: "@it_ski:�������������� �������",
		examHintId: "ex_it_valenok"
	},
	"it_torchlight": {
		hotspotId: "hs_it_torchlight",
		mapTypeId: "dt_item_torchlight",
		alwaysUse: false,
		name: "@it_torchlight:������� � ����� ������",
		examHintId: "ex_it_torchlight"
	},
	"it_data": {
		hotspotId: "hs_it_data",
		mapTypeId: "dt_item_data",
		alwaysUse: false,
		name: "@it_data:���������� ������ ���������� �������",
		examHintId: "ex_it_data"
	},
	"it_passport": {
		hotspotId: "hs_it_passport",
		mapTypeId: "dt_item_passport",
		alwaysUse: false,
		name: "@it_passport:������� ���������� �������",
		examHintId: "ex_it_passport"
	},
	"it_paper": {
		hotspotId: "hs_it_paper",
		mapTypeId: "dt_item_paper",
		alwaysUse: false,
		name: "@it_data:����� ��������� ������",
		examHintId: "ex_it_paper"
	},
	"it_project": {
		hotspotId: "hs_it_project",
		mapTypeId: "dt_item_project",
		alwaysUse: false,
		name: "@it_data:������ ��������������� �������",
		examHintId: "ex_it_project"
	},
	"it_goldball": {
		hotspotId: "hs_it_goldball",
		mapTypeId: "dt_item_goldball",
		alwaysUse: false,
		name: "@it_goldball:������� ���",
		examHintId: "ex_it_goldball"
	},
	"it_tank": {
		hotspotId: "hs_it_tank",
		mapTypeId: "dt_item_tank",
		alwaysUse: false,
		name: "@it_tank:������ ��������� ��������",
		examHintId: "ex_it_tank"
	},
	"it_tank_full": {
		hotspotId: "hs_it_tank_full",
		mapTypeId: "dt_item_tank_full",
		alwaysUse: false,
		name: "@it_tank_full:�������� � ��������",
		examHintId: "ex_it_tank_full"
	},
	"it_scotch": {
		hotspotId: "hs_it_scotch",
		mapTypeId: "dt_item_scotch",
		alwaysUse: false,
		name: "@it_scotch:������ ������������ ������",
		examHintId: "ex_it_scotch"
	},
	"it_iphone": {
		hotspotId: "hs_it_iphone",
		mapTypeId: "dt_item_iphone",
		alwaysUse: false,
		name: "@it_iphone:jPhone XY",
		examHintId: "ex_it_iphone"
	},
	"it_pistol_scotch": {
		hotspotId: "hs_it_pistol_scotch",
		mapTypeId: "dt_item_pistol_scotch",
		alwaysUse: false,
		name: "@it_pistol_scotch:��������, �������� �������",
		examHintId: "ex_it_pistol_scotch"
	},
	"it_pistol_torchlight": {
		hotspotId: "hs_it_pistol_torchlight",
		mapTypeId: "dt_item_pistol_torchlight",
		alwaysUse: false,
		name: "@it_pistol_torchlight:�������� � ������",
		examHintId: "ex_it_pistol_torchlight"
	},
	"it_proc_id": {
		hotspotId: "hs_it_proc_id",
		mapTypeId: "dt_item_proc_id",
		alwaysUse: false,
		name: "@it_proc_id:������������� ����������� ���������",
		examHintId: "ex_it_proc_id"
	},
	"it_ticket": {
		hotspotId: "hs_it_ticket",
		mapTypeId: "dt_item_ticket",
		alwaysUse: false,
		name: "@it_ticket:����� �� ����� �� ���������",
		examHintId: "ex_it_ticket"
	},
};
