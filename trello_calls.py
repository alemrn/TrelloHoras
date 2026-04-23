#!/usr/bin/env python3
"""
Script de ejemplo para realizar las llamadas a la API de Trello equivalentes a las curls.
Uso:
  - Exporta VITE_TRELLO_KEY y VITE_TRELLO_TOKEN o pásalos con --key/--token
  - Ejecuta: python trello_calls.py --short SHORTLINK --card CARD_ID --board BOARD_ID --checklist CHECKLIST_ID

Requiere la librería `requests`: pip install requests
"""

import os
import sys
import argparse
from datetime import date
import requests

API_BASE = 'https://api.trello.com/1'


def build_auth_params(key: str, token: str) -> dict:
    return {'key': key, 'token': token}


def get_card_by_shortlink(shortlink: str, key: str, token: str):
    url = f"{API_BASE}/cards/{shortlink}"
    params = build_auth_params(key, token)
    params.update({'fields': 'idBoard,name,shortLink', 'checklists': 'all'})
    r = requests.get(url, params=params)
    r.raise_for_status()
    return r.json()


def get_board_name(board_id: str, key: str, token: str):
    url = f"{API_BASE}/boards/{board_id}"
    params = build_auth_params(key, token)
    params.update({'fields': 'name'})
    r = requests.get(url, params=params)
    r.raise_for_status()
    return r.json()


def get_card_checklists(card_id: str, key: str, token: str):
    url = f"{API_BASE}/cards/{card_id}/checklists"
    params = build_auth_params(key, token)
    r = requests.get(url, params=params)
    r.raise_for_status()
    return r.json()


def create_checklist(card_id: str, name: str, key: str, token: str):
    url = f"{API_BASE}/checklists"
    params = build_auth_params(key, token)
    data = {'idCard': card_id, 'name': name}
    r = requests.post(url, params=params, data=data)
    r.raise_for_status()
    return r.json()


def add_checklist_item(checklist_id: str, item_name: str, key: str, token: str):
    url = f"{API_BASE}/checklists/{checklist_id}/checkItems"
    params = build_auth_params(key, token)
    data = {'name': item_name}
    r = requests.post(url, params=params, data=data)
    r.raise_for_status()
    return r.json()


def main(argv):
    parser = argparse.ArgumentParser(description='Ejecuta llamadas de ejemplo a la API de Trello')
    parser.add_argument('--key', default=os.getenv('API_KEY'), help='Trello API key')
    parser.add_argument('--token', default=os.getenv('TOKEN'), help='Trello API token')
    parser.add_argument('--short', help='shortLink de la tarjeta (ej: abc123)')
    parser.add_argument('--card', help='ID de la tarjeta (CARD_ID)')
    parser.add_argument('--board', help='ID del tablero (BOARD_ID)')
    parser.add_argument('--checklist', help='ID del checklist (CHECKLIST_ID)')
    parser.add_argument('--hours', default='1.5', help='Horas a añadir (formato decimal)')
    parser.add_argument('--user', default=os.getenv('USER') or 'mi-nick', help='Nick/usuario para el item')
    parser.add_argument('--no-jq', dest='jq', action='store_false', help='No formatear salida JSON (solo imprime raw)')

    args = parser.parse_args(argv)

    if not args.key or not args.token:
        print('Faltan credenciales: define VITE_TRELLO_KEY/VITE_TRELLO_TOKEN o pásalas con --key/--token', file=sys.stderr)
        sys.exit(2)

    try:
        if args.short:
            print('\n1) GET card by shortLink')
            card = get_card_by_shortlink(args.short, args.key, args.token)
            print(card)

        if args.board:
            print('\n2) GET board name')
            board = get_board_name(args.board, args.key, args.token)
            print(board)

        if args.card:
            print('\n3) GET card checklists')
            checklists = get_card_checklists(args.card, args.key, args.token)
            print(checklists)

        if args.card and not args.checklist:
            # ejemplo: crear checklist si no se proporciona checklist id
            print('\n4) POST create checklist (Horas invertidas)')
            created = create_checklist(args.card, 'Horas invertidas', args.key, args.token)
            print(created)
            checklist_id = created.get('id')
        else:
            checklist_id = args.checklist

        if checklist_id:
            item_text = f"{args.hours}h — {args.user} — {date.today().isoformat()}"
            print(f'\n5) POST add checklist item (text: {item_text})')
            item = add_checklist_item(checklist_id, item_text, args.key, args.token)
            print(item)

    except requests.HTTPError as err:
        print('HTTP error:', err.response.status_code, err.response.text, file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print('Error:', str(e), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main(sys.argv[1:])
