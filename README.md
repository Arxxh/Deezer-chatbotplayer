# fastDeezer

Backend en FastAPI para consultar la API publica de Deezer.

## Ejecutar

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
python main.py
```

## Endpoints

- `GET /health`
- `GET /search?q=daft%20punk&limit=10`
- `GET /track/3135556`
