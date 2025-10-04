"""
Card Generator Service - Python backend version
Inspired by Namso Gen algorithm
"""

import random
import json
from typing import Dict, List, Optional


class CardGenerator:
    """Generate credit cards using Luhn algorithm (Namso Gen style)"""

    def __init__(self):
        self.default_bin = "552461"  # MasterCard BIN
        self.card_types = {
            "visa": {"bins": ["4"], "lengths": [16], "cvv_length": 3},
            "mastercard": {
                "bins": [
                    "51",
                    "52",
                    "53",
                    "54",
                    "55",
                    "22",
                    "23",
                    "24",
                    "25",
                    "26",
                    "27",
                ],
                "lengths": [16],
                "cvv_length": 3,
            },
            "amex": {"bins": ["34", "37"], "lengths": [15], "cvv_length": 4},
            "discover": {"bins": ["60", "65"], "lengths": [16], "cvv_length": 3},
            "diners": {"bins": ["30", "36", "38"], "lengths": [14], "cvv_length": 3},
            "jcb": {"bins": ["35"], "lengths": [16], "cvv_length": 3},
        }

    def generate_card(
        self,
        bin_code: str = None,
        month: Optional[str] = None,
        year: Optional[str] = None,
        cvv: Optional[str] = None,
    ) -> Dict[str, str]:
        """Generate a single credit card"""
        bin_code = bin_code or self.default_bin
        bin_code = str(bin_code).strip()

        # Determine card length
        card_length = self._get_card_length(bin_code)

        # Generate card number (Namso Gen style)
        card_number = self._generate_card_number_namso(bin_code, card_length)

        # Generate expiry
        expiry_data = self._generate_expiry_namso(month, year)

        # Generate CVV
        cvv_value = self._generate_cvv_namso(bin_code, cvv)

        return {
            "number": card_number,
            "month": expiry_data["month"],
            "year": expiry_data["year"],
            "expiry": f"{expiry_data['month']}/{expiry_data['year']}",
            "cvv": cvv_value,
            "card_type": self._detect_card_type(bin_code),
        }

    def generate_multiple_cards(
        self,
        quantity: int,
        bin_code: str = None,
        month: Optional[str] = None,
        year: Optional[str] = None,
        cvv: Optional[str] = None,
    ) -> List[Dict[str, str]]:
        """Generate multiple credit cards"""
        cards = []
        for _ in range(quantity):
            card = self.generate_card(bin_code, month, year, cvv)
            cards.append(card)
        return cards

    def _generate_card_number_namso(self, bin_code: str, target_length: int) -> str:
        """Generate card number exactly like Namso Gen"""
        processed_bin = ""

        # Process BIN and replace 'x' with random digits
        for i in range(len(bin_code)):
            if len(processed_bin) >= target_length - 1:
                break

            char = bin_code[i].lower()
            if char == "x":
                processed_bin += str(random.randint(0, 9))
            elif char.isdigit():
                processed_bin += char

        # Fill remaining digits (except last one for checksum)
        while len(processed_bin) < target_length - 1:
            processed_bin += str(random.randint(0, 9))

        # Calculate and append Luhn checksum
        check_digit = self._calculate_luhn_check_digit(processed_bin)
        return processed_bin + str(check_digit)

    def _calculate_luhn_check_digit(self, card_number: str) -> int:
        """Calculate Luhn checksum"""
        digits = [int(d) for d in card_number]

        # Double alternate digits from right
        for i in range(len(digits) - 1, -1, -2):
            digits[i] *= 2
            if digits[i] > 9:
                digits[i] -= 9

        # Sum all digits
        total = sum(digits)

        # Calculate check digit
        mod = total % 10
        check_digit = (10 - mod) if mod != 0 else 0
        return check_digit

    def _get_card_length(self, bin_code: str) -> int:
        """Determine card length based on BIN"""
        clean_bin = bin_code.replace("x", "").replace("X", "").replace(" ", "")

        # Amex
        if clean_bin.startswith(("34", "37")):
            return 15

        # Diners
        if clean_bin.startswith(("30", "36", "38")):
            return 14

        # Default (Visa, MasterCard, Discover, JCB, etc.)
        return 16

    def _generate_expiry_namso(
        self, month_option: Optional[str], year_option: Optional[str]
    ) -> Dict[str, str]:
        """Generate expiry date exactly like Namso Gen"""
        # Month
        if not month_option or month_option == "Random":
            month = f"{random.randint(1, 12):02d}"
        else:
            month = f"{int(month_option):02d}"

        # Year (2025-2033 range, Namso Gen style)
        if not year_option or year_option == "Random":
            year_full = str(random.randint(2025, 2033))
        else:
            year_full = str(year_option)
            if len(year_full) == 2:
                year_full = "20" + year_full

        return {"month": month, "year": year_full[-2:]}  # 2-digit year

    def _generate_cvv_namso(self, bin_code: str, cvv_option: Optional[str]) -> str:
        """Generate CVV exactly like Namso Gen"""
        if cvv_option and cvv_option != "Random":
            cvv_length = 4 if bin_code.startswith(("34", "37")) else 3
            return str(cvv_option).zfill(cvv_length)

        # Determine CVV length (Amex has 4-digit CVV)
        cvv_length = 4 if bin_code.startswith(("34", "37")) else 3

        cvv = "".join([str(random.randint(0, 9)) for _ in range(cvv_length)])
        return cvv.zfill(cvv_length)

    def _detect_card_type(self, bin_code: str) -> str:
        """Detect card type from BIN"""
        clean_bin = bin_code.replace("x", "").replace("X", "").replace(" ", "")

        if clean_bin.startswith("4"):
            return "Visa"
        elif clean_bin.startswith(
            ("51", "52", "53", "54", "55")
        ) or clean_bin.startswith(tuple(f"2{i}" for i in range(2, 8))):
            return "MasterCard"
        elif clean_bin.startswith(("34", "37")):
            return "American Express"
        elif clean_bin.startswith(("60", "65")):
            return "Discover"
        elif clean_bin.startswith(("30", "36", "38")):
            return "Diners Club"
        elif clean_bin.startswith("35"):
            return "JCB"
        else:
            return "Unknown"

    def format_card_number(self, card_number: str) -> str:
        """Format card number with spaces"""
        if len(card_number) == 15:  # Amex
            return f"{card_number[:4]} {card_number[4:10]} {card_number[10:]}"
        elif len(card_number) == 14:  # Diners
            return f"{card_number[:4]} {card_number[4:10]} {card_number[10:]}"
        else:  # 16-digit
            return f"{card_number[:4]} {card_number[4:8]} {card_number[8:12]} {card_number[12:]}"
