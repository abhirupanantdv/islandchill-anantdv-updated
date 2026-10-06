import unittest

from islandchill.api.manufacturing import _stock_entry_item_values


class TestStockEntryItemValues(unittest.TestCase):
	def test_existing_zero_valuation_stock_can_move(self):
		values = _stock_entry_item_values(
			{
				"code": "NO-RATE-ITEM",
				"qty": 2,
				"unit": "Nos",
				"sourceWarehouse": "Stores - CWFPL",
				"targetWarehouse": "Work In Progress - CWFPL",
			}
		)

		self.assertEqual(values["allow_zero_valuation_rate"], 1)
