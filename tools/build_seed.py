#!/usr/bin/env python3
"""Bouwt js/seed.js: seizoen 2024-2025 en 2025-2026 (uit de oude Google Sheets) en de opzet van 2026-2027.

Bron 2024-2025: Google Sheet 'KFC MARKE 2024-2025', tabbladen 'Data ...' (enkel minuten, doelpunten en kaarten).
Bron 2025-2026: Google Sheet 'KFC MARKE 2025-2026', tabbladen 'Data ...'.
Bron 2026-2027: wedstrijdkalender 1e Provinciale (foot24.be, RBFA-gegevens) en de spelerslijst die de gebruiker aanleverde.
Opnieuw uitvoeren:  python3 -I tools/build_seed.py
"""
import json, os, re, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'js', 'seed.js')


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


# ---------------------------------------------------------------- 2025-2026
# idx, nummer, voornaam, achternaam, positie (afgeleid uit de formules van de oude Fantasy-tab)
P25 = [
    (0, '1', 'Robbe', 'Pattijne', 'keeper'),
    (1, '2', 'Lucas', 'Vantieghem', 'verdediger'),
    (2, '4', 'Amaury', 'Demuynck', 'verdediger'),
    (3, '5', 'Joran', 'De Rudder', 'verdediger'),
    (4, '6', 'Lander', 'Denduyver', 'middenvelder'),
    (5, '7', 'Siegurd', 'Defoirdt', 'aanvaller'),
    (6, '8', 'Arne', 'Naessens', 'middenvelder'),
    (7, '9', 'Jelle', 'Duthoo', 'aanvaller'),
    (8, '10', 'Thomas', 'Menghis', 'middenvelder'),
    (9, '11', 'Bob', 'Desmet', 'verdediger'),
    (10, '13', 'Gerben', 'Neirijnck', 'middenvelder'),
    (11, '14', 'Hannes', 'Tieberghien', 'verdediger'),
    (12, '15', 'Sem', 'Menghis', 'middenvelder'),
    (13, '16', 'Lucas', 'Coornaert', 'middenvelder'),
    (14, '17', 'Benjamin', 'Bonte', 'verdediger'),
    (15, '18', 'Emile', 'Vanluchene', 'verdediger'),
    (16, '19', 'Damien', 'Kontogom', 'aanvaller'),
    (17, '20', 'Mounir', 'Bouhid', 'aanvaller'),
    (18, '23', 'Noé', 'Rogard', 'verdediger'),
    (19, '24', 'Jannis', 'Bourgeois', 'middenvelder'),
    (20, '28', 'Colin', 'Degrande', 'keeper'),
    (21, '34', 'Jarne', 'Wullaert', 'middenvelder'),
]
STAFF = [
    (22, 'T1', 'Davy', 'Vercruysse', 'trainer'),
    (23, 'T2', 'Thibeau', 'Herreman', 'trainer'),
    (24, 'KT', 'Robbe', 'Libbrecht', 'keeperstrainer'),
    (25, 'D1', 'Jens', 'Cattrel', 'delegee'),
    (26, 'D2', 'Viktor', 'Forrez', 'delegee'),
]

# extra staf vanaf 2026-2027
STAFF26_EXTRA = [('V1', 'Ivana', 'Bourgeois', 'verzorger')]

# datum, tegenstander, thuis
M25 = [
    ('2025-08-31', 'Wielsbeke', 1), ('2025-09-07', 'Bredene', 0), ('2025-09-14', 'Zwevegem', 1), ('2025-09-21', 'Moorsele', 0),
    ('2025-09-28', 'Heist', 1), ('2025-10-05', 'Wervik', 1), ('2025-10-12', 'Ardooie', 0), ('2025-10-19', 'Oudenburg', 0),
    ('2025-10-26', 'Aalbeke', 1), ('2025-11-01', 'Varsenare', 0), ('2025-11-09', 'Wevelgem', 1), ('2025-11-15', 'Heestert', 0),
    ('2025-11-23', 'Bissegem', 1), ('2025-11-30', 'Roeselare', 0), ('2025-12-07', 'Waregem', 1), ('2025-12-14', 'Varsenare', 1),
    ('2026-01-10', 'Wevelgem', 0), ('2026-01-17', 'Aalbeke', 0), ('2026-01-25', 'Oudenburg', 1), ('2026-01-31', 'Wervik', 0),
    ('2026-02-08', 'Moorsele', 1), ('2026-02-22', 'Waregem', 0), ('2026-03-01', 'Bredene', 1), ('2026-03-07', 'Bissegem', 0),
    ('2026-03-15', 'Ardooie', 1), ('2026-03-22', 'Wielsbeke', 0), ('2026-03-29', 'Heist', 0), ('2026-04-12', 'Roeselare', 1),
    ('2026-04-18', 'Zwevegem', 0), ('2026-04-26', 'Sparta Heestert', 1),
]

# speelminuten per wedstrijd, kolom = speler-idx; leeg = niet in selectie, 0 = op de bank zonder invallen
MIN25 = [
    ',35,71,,90,7,90,83,55,,90,19,,,,52,71,19,90,7,90,83',
    ',90,90,,90,20,70,45,45,45,70,20,,,,,45,45,90,45,90,90',
    '0,61,14,,90,,90,90,69,76,61,29,,,,90,90,21,,29,90,90',
    '0,90,,,76,,90,90,90,90,76,14,0,,,90,14,76,,14,90,90',
    '0,30,,,60,,90,90,90,15,75,,,5,90,90,90,75,,15,90,85',
    '90,9,,,36,,81,90,90,90,54,,,9,90,90,90,81,,0,0,90',
    '90,,5,,10,,85,67,80,85,,90,,23,5,90,90,,90,90,0,90',
    '90,,2,,2,,90,68,78,88,22,90,,12,,90,88,,90,90,0,90',
    '90,,70,,15,,90,90,72,90,18,90,,15,,90,75,,20,90,0,75',
    '90,11,79,,11,,68,90,90,79,22,90,,30,11,90,60,,,79,,90',
    '90,90,90,,8,,90,89,90,,90,90,0,17,1,90,,,,82,0,73',
    '90,77,90,,30,,90,77,70,,60,90,,13,13,90,30,,,90,0,90',
    '90,6,90,,90,,63,90,77,77,,90,,13,90,84,27,,,13,0,90',
    '90,1,90,,9,,81,64,81,1,89,90,,9,90,89,26,,,90,,90',
    '90,0,90,,8,,90,73,82,17,73,90,,,90,90,17,,,90,0,90',
    '90,11,79,,30,,90,90,60,45,45,68,,22,90,90,30,,,60,,90',
    '90,,90,,90,,,90,90,,,90,66,45,0,45,79,,24,90,,79',
    '90,65,15,,65,,90,90,90,25,90,65,,,75,90,25,,,25,0,90',
    '90,70,90,,90,,,90,90,,90,90,0,,20,90,,,,90,0,70',
    '90,4,90,,58,,,90,90,,78,90,12,,90,90,32,,,86,,90',
    '90,18,84,,90,,,90,90,,90,90,,6,72,90,22,,,90,0,68',
    '90,25,90,,90,,15,90,75,,,90,0,75,,90,15,,65,90,0,90',
    '90,90,,,45,,45,61,45,61,29,90,,90,2,90,29,,90,45,,88',
    '90,64,45,,90,,26,90,90,64,26,90,,26,17,73,,,45,64,,90',
    '90,90,90,,90,,90,74,74,61,29,90,,16,74,16,5,,,16,,85',
    '90,90,90,,90,7,90,83,72,72,90,,,18,90,0,,,0,18,,90',
    '90,90,90,,90,32,58,90,58,20,70,90,,32,58,,,,32,70',
    '90,90,90,,90,77,90,25,65,65,45,45,,86,4,,,,90,,,25',
    '90,90,90,,90,7,90,90,90,83,0,90,,0,,,,,90,0,,90',
    ',90,90,,90,27,45,63,63,27,90,63,,27,65,,,,25,45,,90',
]

# doelpunten {wedstrijd: {speler-idx: aantal}}
GOALS = {
    1: {2: 1, 16: 1, 17: 1, 21: 1}, 2: {6: 1, 7: 1, 8: 1, 10: 1, 18: 1}, 3: {6: 1}, 4: {1: 1, 17: 1},
    5: {6: 1, 7: 1, 14: 1, 15: 1, 16: 1}, 6: {17: 1, 21: 1}, 7: {21: 1}, 9: {7: 3}, 10: {7: 1, 13: 1}, 11: {21: 1},
    12: {7: 1, 21: 1}, 13: {6: 1, 7: 2}, 14: {8: 1, 13: 1, 14: 1}, 15: {7: 2, 21: 1}, 16: {6: 1}, 18: {2: 1, 8: 1, 21: 1},
    21: {7: 1, 21: 1}, 23: {1: 1, 7: 1, 9: 1, 13: 1, 16: 1, 21: 1}, 24: {7: 1}, 25: {7: 1, 8: 1, 21: 2},
    27: {4: 1, 7: 1}, 28: {13: 1}, 29: {7: 1, 21: 1}, 30: {4: 1, 7: 1, 11: 1},
}
G_CORNER = {(4, 1), (5, 15), (23, 1)}
G_FREE = {(1, 21), (2, 10), (5, 14), (29, 7)}
G_PEN = {(6, 21), (14, 14), (27, 7)}

ASSISTS = {
    1: {6: 2, 7: 1}, 2: {4: 1, 7: 1, 10: 1, 21: 1}, 3: {10: 1}, 4: {10: 1}, 5: {14: 1, 15: 1, 21: 2}, 6: {7: 1}, 7: {19: 1},
    9: {6: 1, 11: 1, 21: 1}, 10: {6: 1, 7: 1}, 11: {7: 1}, 12: {6: 1}, 13: {2: 1, 7: 1, 21: 1}, 14: {21: 2},
    15: {9: 1, 10: 1, 21: 1}, 16: {16: 1}, 18: {8: 1, 14: 1, 21: 1}, 19: {10: 1}, 21: {2: 1, 19: 1},
    23: {6: 1, 13: 2, 21: 1}, 24: {2: 1}, 25: {7: 1, 9: 2, 11: 1}, 27: {5: 1}, 28: {5: 1}, 29: {7: 1, 21: 1}, 30: {11: 1, 21: 2},
}
YELLOW = {
    2: {13: 1, 16: 1}, 3: {3: 1, 5: 1, 7: 1, 8: 1, 10: 1, 17: 1}, 6: {1: 1, 14: 1, 17: 1}, 8: {6: 1}, 9: {23: 1},
    11: {19: 1, 21: 1}, 12: {2: 1, 5: 1, 12: 1, 14: 1}, 13: {8: 1, 15: 1, 21: 1}, 15: {9: 1}, 16: {5: 1, 16: 1},
    17: {12: 1, 15: 1, 18: 1}, 18: {6: 1, 16: 1}, 20: {16: 1}, 24: {2: 1}, 25: {1: 1}, 26: {21: 1}, 27: {4: 1, 5: 1},
    29: {21: 1}, 30: {5: 1, 9: 1},
}
RED = {1: {15: 1}, 30: {2: 1}}
SUSP = {2: {15: 1}, 13: {5: 1}, 19: {16: 1}, 27: {21: 1}}
# man of the match: oude sheet gaf punten (3/2/1). Omgezet naar rang 1/2/3.
MOTM_PTS = {
    1: {6: 2, 16: 1, 20: 3}, 2: {7: 1, 8: 2, 10: 3}, 5: {6: 1, 14: 3, 21: 2}, 9: {7: 3, 19: 1, 21: 2},
    11: {0: 1, 2: 2, 21: 3}, 12: {0: 2, 15: 3, 21: 1}, 14: {8: 1, 10: 3, 15: 2, 21: 2}, 15: {11: 2, 15: 3, 21: 1},
    18: {0: 2, 8: 3, 15: 1}, 21: {0: 1, 4: 2, 7: 3}, 23: {9: 1, 11: 2, 21: 3}, 25: {9: 2, 11: 1, 21: 3},
    27: {0: 3, 4: 2, 7: 1},
}
RANK = {3: 1, 2: 2, 1: 3}

# tegendoelpunten: totaal, corner, vrije trap, strafschop, own error, kwaliteit
GA = [
    (3, 1, 0, 0, 1, 1), (1, 0, 0, 1, 0, 0), (4, 1, 1, 0, 0, 2), (2, 0, 0, 0, 1, 1), (3, 1, 0, 0, 0, 2), (3, 1, 1, 0, 1, 0),
    (2, 1, 0, 0, 1, 0), (0, 0, 0, 0, 0, 0), (1, 0, 0, 0, 0, 1), (2, 0, 0, 0, 0, 2), (0, 0, 0, 0, 0, 0), (1, 1, 0, 0, 0, 0),
    (3, 0, 0, 1, 1, 1), (0, 0, 0, 0, 0, 0), (0, 0, 0, 0, 0, 0), (3, 0, 0, 0, 1, 2), (3, 0, 0, 0, 2, 1), (2, 0, 1, 0, 1, 0),
    (1, 0, 0, 0, 1, 0), (1, 0, 0, 0, 0, 1), (1, 0, 0, 0, 0, 1), (0, 0, 0, 0, 0, 0), (1, 0, 0, 0, 1, 0), (4, 0, 1, 0, 0, 3),
    (2, 0, 1, 0, 1, 0), (0, 0, 0, 0, 0, 0), (1, 0, 0, 0, 1, 0), (1, 1, 0, 0, 0, 0), (2, 0, 0, 0, 0, 2), (4, 0, 1, 0, 2, 1),
]
N = None
# stilstaande fases voor ons: corners, vrije trappen, strafschoppen
SP = [(N, 5, N), (10, 3, N), (6, 2, N), (6, 2, N), (7, 4, N), (8, 2, 1), (8, 2, N), (8, 2, N), (6, 3, N), (7, N, N), (11, 6, N),
      (5, 4, N), (7, 1, N), (9, 4, 1), (2, 3, N), (6, 3, N), (3, 3, N), (6, 4, N), (8, 3, N), (7, 3, N), (4, 4, N), (6, 2, N),
      (18, N, N), (7, 3, N), (3, 1, N), (5, 1, N), (4, 3, 1), (12, 3, N), (2, 3, N), (6, N, N)]
OPP = [(5, 3, 2), (N, N, 1), (3, 2, N), (N, N, N), (11, 2, N), (5, 3, N), (6, N, N), (4, 3, N), (5, 4, N), (9, 1, N), (2, 5, N),
       (10, 4, N), (2, 4, 1), (1, N, N), (4, 3, N), (1, N, N), (4, 2, N), (9, 3, N), (6, 1, N), (5, 0, N), (3, 2, N), (3, 3, N),
       (2, 1, N), (5, 2, N), (6, 4, N), (5, 4, N), (4, 2, N), (6, 1, N), (6, 4, N), (2, 1, N)]

# handmatige correcties uit de oude Fantasy-sheet (bron blijft zichtbaar in de app)
ADJUST25 = {
    7: (3, 'Overgenomen uit de oude sheet: +2 bij de doelpunten en +1 clean sheet'),
    15: (-2, 'Eigen doelpunt (-2), wedstrijd niet bijgehouden'),
    20: (10, '2 gestopte penalty\'s (+5 elk), wedstrijden niet bijgehouden'),
}

RULES25 = {'red': -2, 'twoYellowsIsRed': False, 'motmOnlyOnWin': False}

# ---------------------------------------------------------------- 2024-2025
# Bron: Google Sheet 'KFC MARKE 2024-2025' (tabbladen 'Data ...'). Uitslagen: RBFA-kalender via voetbalexpress.be.
# Toen werden geen assists, doelpuntsoorten, man van de match of fantasypunten bijgehouden.
P24 = [
    (0, '1', 'Robbe', 'Pattijne'),
    (1, '2', 'Aaron', 'De Veirman'),
    (2, '3', 'Noé', 'Rogard'),
    (3, '4', 'Henri', 'Deprez'),
    (4, '5', 'Joran', 'De Rudder'),
    (5, '6', 'Lander', 'Denduyver'),
    (6, '7', 'Siegurd', 'Defoirdt'),
    (7, '8', 'Arne', 'Naessens'),
    (8, '9', 'Jordy', 'Balcaen'),
    (9, '10', 'Thomas', 'Menghis'),
    (10, '11', 'Thijs', 'De Leeuw'),
    (11, '12', 'Hamza', 'El Arini'),
    (12, '13', 'Gerben', 'Neirijnck'),
    (13, '14', 'Hannes', 'Tieberghien'),
    (14, '15', 'Matthias', 'Cottenier'),
    (15, '16', 'Lucas', 'Coornaert'),
    (16, '17', 'Benjamin', 'Bonte'),
    (17, '18', 'Emile', 'Vanluchene'),
    (18, '19', 'Damien', 'Kontogom'),
    (19, '20', 'Enver', 'De Weirdt'),
    (20, '21', 'Lukas', 'Vantieghem'),
    (21, '22', 'Bob', 'Hochepied'),
    (22, '23', 'Gilles', 'Herreman'),
    (23, '24', 'Jannis', 'Bourgeois'),
    (24, '25', 'Jonas', 'Beernaert'),
    (25, '26', 'Anthony', 'Degrendel'),
]
STAFF24 = [
    (26, 'T1', 'Davy', 'Vercruysse', 'trainer'),
    (27, 'T2', 'Thibeau', 'Herreman', 'trainer'),
    (28, 'KT', 'Robbe', 'Libbrecht', 'keeperstrainer'),
    (29, 'D1', 'Jens', 'Cattrel', 'delegee'),
    (30, 'D2', 'Viktor', 'Forrez', 'delegee'),
]
# datum, tegenstander, thuis, score voor, score tegen
M24 = [
    ('2024-09-01', 'Waregem', 1, 0, 2),
    ('2024-09-07', 'Rumbeke', 0, 0, 2),
    ('2024-09-14', 'Moen', 0, 1, 1),
    ('2024-09-22', 'Wevelgem', 1, 1, 1),
    ('2024-09-28', 'Zwevegem', 0, 2, 1),
    ('2024-10-06', 'Oostnieuwkerke', 1, 2, 2),
    ('2024-10-13', 'Jong Male', 0, 2, 2),
    ('2024-10-20', 'Ardooie', 1, 1, 1),
    ('2024-10-26', 'Varsenare', 0, 1, 0),
    ('2024-11-03', 'Boezinge', 1, 1, 1),
    ('2024-11-10', 'Roeselare', 1, 2, 1),
    ('2024-11-16', 'Zedelgem', 0, 1, 0),
    ('2024-11-24', 'Houthulst', 1, 4, 2),
    ('2024-12-01', 'Bredene', 0, 0, 2),
    ('2024-12-08', 'Sparta Heestert', 0, 2, 2),
    ('2024-12-15', 'Zwevegem', 1, 1, 1),
    ('2025-01-12', 'Ardooie', 0, 0, 1),
    ('2025-01-19', 'Jong Male', 1, 3, 0),
    ('2025-01-26', 'Rumbeke', 1, 0, 3),
    ('2025-02-02', 'Roeselare', 0, 3, 3),
    ('2025-02-09', 'Varsenare', 1, 0, 0),
    ('2025-02-16', 'Waregem', 0, 0, 2),
    ('2025-02-23', 'Zedelgem', 1, 1, 1),
    ('2025-03-08', 'Boezinge', 0, 0, 0),
    ('2025-03-16', 'Bredene', 1, 4, 0),
    ('2025-03-22', 'Oostnieuwkerke', 0, 2, 1),
    ('2025-03-30', 'Moen', 1, 1, 0),
    ('2025-04-05', 'Houthulst', 0, 3, 1),
    ('2025-04-12', 'Wevelgem', 0, 3, 1),
    ('2025-04-27', 'Sparta Heestert', 1, 0, 3),
]
# speelminuten per wedstrijd, kolom = idx (0-25 spelers, 26-30 staf); leeg = niet in selectie
MIN24 = [
    '90,90,13,77,45,90,33,,57,69,45,31,,,,36,90,83,,,,,,90',
    '0,90,,62,,90,90,20,75,90,15,70,28,,62,,90,,,,28,,,90,,90',
    '0,77,,0,,90,90,71,90,90,,19,46,,13,,44,90,,,90,,,90,,90',
    '0,68,,0,,90,68,,90,90,12,22,,,90,,90,90,10,,90,,,90,,90',
    ',90,,0,10,80,85,24,90,90,5,90,,,90,,,66,,,90,,,90,,90',
    ',20,15,,,8,75,70,46,90,,82,,,90,,90,90,44,,90,,,90,,90',
    ',65,11,,,90,,25,65,90,,,,25,79,17,90,90,90,,73,,,90,,90',
    ',90,45,,,90,37,65,13,90,,,,32,45,25,90,58,77,,45,,,90,,90',
    '0,78,,,,83,,90,7,39,,,,90,12,51,90,90,83,7,90,,,90,,90',
    '0,,0,,,90,3,90,8,,,,,90,90,82,90,90,87,0,90,,,90,,90',
    ',44,1,,,77,44,90,13,,,,,46,90,46,90,90,89,,90,,,90,,90',
    '0,90,0,,0,90,85,90,70,,,,,,90,20,5,90,90,,90,,,90,,90',
    '0,70,12,,,90,90,78,66,,,,,45,45,24,20,90,90,,90,,,90,,90',
    ',90,28,,,90,90,90,90,,,,,62,28,28,73,90,,17,62,,,62,,90',
    '0,90,23,,,86,83,90,7,23,,,,90,4,67,,90,90,,67,,,90,,90',
    ',81,90,,,73,81,90,17,24,,,9,90,9,66,,90,90,,0,,,90,,90',
    ',90,55,,,80,70,,20,10,,,80,80,10,,90,90,90,10,35,,,90,,90',
    ',90,,0,,,15,,0,90,,,90,90,24,,90,90,75,66,90,,,90,,90',
    ',90,13,13,,90,32,,32,90,,,90,34,56,,77,77,58,58,90,,,,,90',
    '0,90,10,,,90,90,20,14,90,,,76,,,,80,90,70,10,80,,,90,,90',
    '0,,0,,,81,,90,77,90,,,86,90,49,,41,90,,4,90,,,90,,90',
    '0,45,13,,,90,28,90,13,90,,,90,90,45,,,90,77,,77,,,62,,90',
    '0,88,,90,,,89,90,,90,,,45,90,2,45,,,85,5,90,,,90,1,90',
    ',,19,90,,90,84,75,15,,,,90,90,6,84,90,6,71,,90,,,,,90',
    '0,14,26,64,,90,90,,,90,,,,76,90,90,64,26,76,,90,,,14,,90',
    '0,54,90,,,90,81,36,9,90,,,,90,,58,90,,90,,90,,,32,,90',
    ',90,90,,,90,15,75,1,89,,,8,90,,45,90,,82,,90,,,45,,90',
    ',90,90,,9,90,26,90,20,90,,,64,,,70,90,,81,,64,,,26,,90',
    ',,90,,,68,5,90,12,90,,,90,90,,85,90,,78,,90,,,22,,90',
    '',
]
GOALS24 = {3: {14: 1}, 4: {8: 1}, 5: {6: 1, 9: 1}, 6: {6: 2}, 7: {7: 1, 18: 1}, 8: {5: 1}, 9: {18: 1}, 10: {18: 1}, 11: {8: 1, 16: 1}, 12: {7: 1}, 13: {6: 2, 17: 1, 20: 1}, 15: {6: 1, 18: 1}, 16: {18: 1}, 18: {1: 1, 6: 1, 9: 1}, 20: {6: 1, 9: 2}, 23: {1: 1}, 25: {6: 1, 15: 1, 16: 1, 18: 1}, 26: {2: 1, 18: 1}, 27: {13: 1}, 28: {6: 1, 18: 2}, 29: {2: 1, 6: 1, 20: 1}}
YELLOW24 = {1: {1: 1, 3: 1}, 2: {2: 1}, 3: {17: 1, 26: 1, 27: 1}, 4: {9: 1}, 6: {16: 1}, 7: {2: 1, 10: 1}, 8: {3: 1}, 9: {17: 1, 18: 1, 23: 1, 24: 1}, 10: {7: 1, 20: 1}, 11: {5: 1}, 12: {6: 1, 7: 1, 11: 1, 12: 1, 18: 1}, 13: {1: 1, 18: 1, 24: 1}, 14: {14: 1, 23: 1}, 15: {5: 1}, 16: {9: 1, 18: 1}, 17: {2: 1, 5: 1, 18: 1}, 18: {23: 1}, 19: {0: 1, 19: 1}, 20: {1: 1, 18: 1, 20: 1}, 21: {3: 1, 12: 1, 14: 1, 23: 1, 24: 1}, 22: {6: 1, 17: 1, 23: 1}, 23: {2: 1, 4: 1, 9: 1, 23: 1}, 24: {7: 1}, 26: {8: 1}, 27: {13: 1}, 28: {9: 1, 15: 1}, 29: {2: 1}}
RED24 = {1: {15: 1, 17: 1}, 8: {2: 1, 6: 1}, 11: {19: 1}, 21: {5: 1}}

# Dezelfde speler, in de sheet van 2024-2025 anders gespeld
ALIAS24 = {('Lukas', 'Vantieghem'): ('Lucas', 'Vantieghem')}
KEEPERS24 = {'Robbe Pattijne', 'Anthony Degrendel'}
RULES24 = {'basic': True}

# ---------------------------------------------------------------- 2026-2027
# datum, kickoff, tegenstander, thuis, score voor, score tegen  (alleen 1e Provinciale: 30 wedstrijden)
M26 = [
    ('2026-08-30', '15:00', 'Bissegem', 1, 1, 3), ('2026-09-05', '19:00', 'Ingelmunster', 0, 2, 1),
    ('2026-09-13', '15:00', 'Wielsbeke', 0, 0, 3), ('2026-09-20', '15:00', 'Boezinge', 1, 1, 1),
    ('2026-09-26', '19:00', 'Sparta Heestert', 0, 4, 0), ('2026-10-04', '15:00', 'Ardooie', 1, 4, 3),
    ('2026-10-10', '19:45', 'Varsenare', 0, 0, 2), ('2026-10-18', '15:00', 'Roeselare', 1, 2, 4),
    ('2026-10-24', '18:30', 'Wervik', 0, 7, 0), ('2026-11-01', '15:00', 'Aalbeke', 1, 3, 1),
    ('2026-11-08', '15:00', 'Waregem', 0, 4, 2), ('2026-11-15', '15:00', 'Heist', 1, 3, 1),
    ('2026-11-22', '15:00', 'Beveren-Leie', 0, 2, 0),
    ('2026-11-29', '15:00', 'Veurne', 1, N, N), ('2026-12-05', '20:00', 'Wevelgem City', 0, N, N),
    ('2026-12-13', '15:00', 'Sparta Heestert', 1, N, N), ('2027-01-09', '18:30', 'Boezinge', 0, N, N),
    ('2027-01-17', '15:00', 'Wielsbeke', 1, N, N), ('2027-01-24', '15:00', 'Waregem', 1, N, N),
    ('2027-01-30', '', 'Bissegem', 0, N, N), ('2027-02-13', '', 'Veurne', 0, N, N), ('2027-02-21', '', 'Wevelgem City', 1, N, N),
    ('2027-02-28', '', 'Ardooie', 0, N, N), ('2027-03-07', '', 'Varsenare', 1, N, N), ('2027-03-14', '', 'Heist', 0, N, N),
    ('2027-03-21', '', 'Beveren-Leie', 1, N, N), ('2027-04-04', '', 'Ingelmunster', 1, N, N), ('2027-04-10', '', 'Aalbeke', 0, N, N),
    ('2027-04-18', '', 'Wervik', 1, N, N), ('2027-04-25', '', 'Roeselare', 0, N, N),
]
# spelerslijst 2026-2027: voornaam, achternaam, keeper?
P26 = [
    ('Benjamin', 'Bonte', 0), ('Jannis', 'Bourgeois', 0), ('Jasper', 'Cafmeyer', 0), ('Mohamed', 'Camara', 0),
    ('Lucas', 'Coornaert', 0), ('Anthony', 'Degrendel', 1), ('Amaury', 'Demuynck', 0), ('Lander', 'Denduyver', 0),
    ('Bob', 'Desmet', 0), ('Jelle', 'Duthoo', 0), ('Sem', 'Menghis', 0), ('Thomas', 'Menghis', 0), ('Arne', 'Naessens', 0),
    ('Robbe', 'Pattijne', 1), ('Mathijs', 'Pieters', 0), ('Noé', 'Rogard', 0), ('Brecht', 'Santy', 0),
    ('Bastien', 'Servaege', 1), ('Hannes', 'Tieberghien', 0), ('Michiel', 'Tieberghien', 0), ('Thibault', 'Trioen', 0),
    ('Simon', 'Van Lierde', 0), ('Emile', 'Vanluchene', 0), ('Gaetan', 'Vercaemer', 0), ('Jarne', 'Wullaert', 0),
]


def build():
    people = {}
    roster = []
    matches = []
    lines = []

    def person(first, last):
        pid = 'p-' + slug(first + ' ' + last)
        people[pid] = {'id': pid, 'first_name': first, 'last_name': last}
        return pid

    # ---- seizoen 2024-2025 (enkel minuten, doelpunten, kaarten en uitslagen)
    s24 = {'id': 's2024', 'name': '2024-2025', 'start_year': 2024, 'rules': RULES24,
           'note': 'Overgenomen uit de Google Sheet KFC MARKE 2024-2025: enkel minuten, doelpunten en kaarten. Uitslagen uit de RBFA-kalender.'}
    prev_pos24 = {(f + ' ' + l): pos for _, _, f, l, pos in P25}
    rid24 = {}
    for idx, num, first, last in P24:
        first, last = ALIAS24.get((first, last), (first, last))
        pid = person(first, last)
        rid = 'r2024-' + slug(first + ' ' + last)
        rid24[idx] = rid
        name = first + ' ' + last
        pos = 'keeper' if name in KEEPERS24 else prev_pos24.get(name, '')
        roster.append({'id': rid, 'season_id': 's2024', 'person_id': pid, 'role': 'speler', 'number': num, 'position': pos})
    for idx, num, first, last, pos in STAFF24:
        pid = person(first, last)
        rid = 'r2024-' + slug(first + ' ' + last)
        rid24[idx] = rid
        roster.append({'id': rid, 'season_id': 's2024', 'person_id': pid, 'role': 'staf', 'number': num, 'position': pos})
    for i, (d, opp, home, sf, sa) in enumerate(M24, start=1):
        mid = 'm2024-%02d' % i
        matches.append({'id': mid, 'season_id': 's2024', 'date': d, 'opponent': opp, 'home': bool(home), 'competition': 'competitie',
                        'score_for': sf, 'score_against': sa})
        per = {}
        for idx, t in enumerate(MIN24[i - 1].split(',')):
            if t != '': per.setdefault(idx, {})['minutes'] = int(t)
        for idx, q in GOALS24.get(i, {}).items():
            per.setdefault(idx, {})['g_play'] = q
        for name, src in (('yellow', YELLOW24), ('red', RED24)):
            for idx, q in src.get(i, {}).items():
                per.setdefault(idx, {})[name] = q
        for idx, d_ in sorted(per.items()):
            row = {'id': mid + ':' + rid24[idx], 'match_id': mid, 'roster_id': rid24[idx]}
            row.update(d_)
            lines.append(row)

    # ---- seizoen 2025-2026
    s25 = {'id': 's2025', 'name': '2025-2026', 'start_year': 2025, 'rules': RULES25, 'note': 'Overgenomen uit de Google Sheet KFC MARKE 2025-2026'}
    rid25 = {}
    for idx, num, first, last, pos in P25 + STAFF:
        pid = person(first, last)
        rid = 'r2025-' + slug(first + ' ' + last)
        rid25[idx] = rid
        row = {'id': rid, 'season_id': 's2025', 'person_id': pid, 'role': 'staf' if idx >= 22 else 'speler', 'number': num, 'position': pos}
        if idx in ADJUST25:
            row['adjust'], row['adjust_note'] = ADJUST25[idx]
        roster.append(row)

    for i, (d, opp, home) in enumerate(M25, start=1):
        mid = 'm2025-%02d' % i
        goals = GOALS.get(i, {})
        ga = GA[i - 1]
        sp, op = SP[i - 1], OPP[i - 1]
        m = {'id': mid, 'season_id': 's2025', 'date': d, 'opponent': opp, 'home': bool(home), 'competition': 'competitie',
             'score_for': sum(goals.values()), 'score_against': ga[0]}
        for k, v in zip(('ga_corner', 'ga_free', 'ga_pen', 'ga_error', 'ga_quality'), ga[1:]):
            m[k] = v
        for k, v in zip(('sp_corners', 'sp_free', 'sp_pens'), sp):
            if v is not None: m[k] = v
        for k, v in zip(('opp_corners', 'opp_free', 'opp_pens'), op):
            if v is not None: m[k] = v
        matches.append(m)

        mins = MIN25[i - 1].split(',')
        per = {}
        for idx, t in enumerate(mins):
            if t != '': per.setdefault(idx, {})['minutes'] = int(t)
        for idx, q in goals.items():
            c = 1 if (i, idx) in G_CORNER else 0
            f = 1 if (i, idx) in G_FREE else 0
            p = 1 if (i, idx) in G_PEN else 0
            d_ = per.setdefault(idx, {})
            if c: d_['g_corner'] = c
            if f: d_['g_free'] = f
            if p: d_['g_pen'] = p
            if q - c - f - p: d_['g_play'] = q - c - f - p
        for name, src in (('assists', ASSISTS), ('yellow', YELLOW), ('red', RED)):
            for idx, q in src.get(i, {}).items():
                per.setdefault(idx, {})[name] = q
        for idx, q in SUSP.get(i, {}).items():
            per.setdefault(idx, {})['suspended'] = 1
        for idx, pts in MOTM_PTS.get(i, {}).items():
            per.setdefault(idx, {})['motm'] = RANK[pts]
        for idx, d_ in sorted(per.items()):
            row = {'id': mid + ':' + rid25[idx], 'match_id': mid, 'roster_id': rid25[idx]}
            row.update(d_)
            lines.append(row)

    seasons = [s24, s25]
    # ---- seizoen 2026-2027
    s26 = {'id': 's2026', 'name': '2026-2027', 'start_year': 2026, 'rules': {}, 'note': 'Kalender 1e Provinciale West-Vlaanderen (RBFA / foot24.be)'}
    seasons.append(s26)
    prev_pos = {(f + ' ' + l): pos for _, _, f, l, pos in P25}
    for first, last, gk in P26:
        pid = person(first, last)
        pos = 'keeper' if gk else prev_pos.get(first + ' ' + last, '')
        if first + ' ' + last == 'Noé Rogard': pos = 'verdediger'
        roster.append({'id': 'r2026-' + slug(first + ' ' + last), 'season_id': 's2026', 'person_id': pid, 'role': 'speler', 'number': '', 'position': pos})
    for idx, num, first, last, pos in STAFF + [(None,) + t for t in STAFF26_EXTRA]:
        pid = person(first, last)
        roster.append({'id': 'r2026-' + slug(first + ' ' + last), 'season_id': 's2026', 'person_id': pid, 'role': 'staf', 'number': num, 'position': pos})
    for i, (d, ko, opp, home, sf, sa) in enumerate(M26, start=1):
        m = {'id': 'm2026-%02d' % i, 'season_id': 's2026', 'date': d, 'opponent': opp, 'home': bool(home), 'competition': 'competitie'}
        if ko: m['kickoff'] = ko
        if sf is not None: m['score_for'], m['score_against'] = sf, sa
        matches.append(m)

    return {'seasons': seasons, 'people': sorted(people.values(), key=lambda p: p['id']), 'roster': roster, 'matches': matches, 'lines': lines}


if __name__ == '__main__':
    data = build()
    with open(OUT, 'w', encoding='utf8') as f:
        f.write('/* Gegenereerd door tools/build_seed.py. Niet met de hand aanpassen. */\n')
        f.write('window.KFC_SEED = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('seed.js geschreven:', {k: len(v) for k, v in data.items()})
