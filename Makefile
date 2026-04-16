PYTHON_BACKEND_DIR := python-backend
PYTHON_BACKEND_VENV := $(PYTHON_BACKEND_DIR)/.venv
PYTHON_BACKEND_PYTHON := $(PYTHON_BACKEND_VENV)/bin/python
PYTHON_BACKEND_PIP := $(PYTHON_BACKEND_VENV)/bin/pip
PYTHON_BACKEND_UVICORN := $(PYTHON_BACKEND_VENV)/bin/uvicorn
PYTHON_BACKEND_APP := app.main:app
PYTHONPATH_BACKEND := $(CURDIR)/$(PYTHON_BACKEND_DIR)
BACKEND_HOST ?= 127.0.0.1
BACKEND_PORT ?= 4000

.PHONY: help backend-venv backend-install backend-dev backend-dev-lan backend-run backend-test backend-routes backend-clean-venv

help:
	@printf "Targets disponibles:\n"
	@printf "  make backend-venv      Crear el entorno virtual del backend\n"
	@printf "  make backend-install   Instalar dependencias del backend Python\n"
	@printf "  make backend-dev       Levantar backend en 127.0.0.1:4000 con reload\n"
	@printf "  make backend-dev-lan   Levantar backend en 0.0.0.0:4000 con reload\n"
	@printf "  make backend-run       Levantar backend sin reload\n"
	@printf "  make backend-test      Correr tests del backend Python\n"
	@printf "  make backend-routes    Mostrar rutas registradas del backend\n"
	@printf "  make backend-clean-venv Eliminar .venv del backend\n"

backend-venv:
	python3 -m venv $(PYTHON_BACKEND_VENV)

backend-install: backend-venv
	$(PYTHON_BACKEND_PIP) install -r $(PYTHON_BACKEND_DIR)/requirements.txt

backend-dev:
	cd $(PYTHON_BACKEND_DIR) && PYTHONPATH=$(PYTHONPATH_BACKEND) .venv/bin/uvicorn $(PYTHON_BACKEND_APP) --host 127.0.0.1 --port $(BACKEND_PORT) --reload

backend-dev-lan:
	cd $(PYTHON_BACKEND_DIR) && PYTHONPATH=$(PYTHONPATH_BACKEND) .venv/bin/uvicorn $(PYTHON_BACKEND_APP) --host 0.0.0.0 --port $(BACKEND_PORT) --reload

backend-run:
	cd $(PYTHON_BACKEND_DIR) && PYTHONPATH=$(PYTHONPATH_BACKEND) .venv/bin/uvicorn $(PYTHON_BACKEND_APP) --host $(BACKEND_HOST) --port $(BACKEND_PORT)

backend-test:
	PYTHONPATH=$(PYTHONPATH_BACKEND) $(PYTHON_BACKEND_PYTHON) -m unittest discover -s $(PYTHON_BACKEND_DIR)/tests

backend-routes:
	PYTHONPATH=$(PYTHONPATH_BACKEND) $(PYTHON_BACKEND_PYTHON) -c "from app.main import app; [print(route.path) for route in sorted(app.routes, key=lambda item: item.path)]"

backend-clean-venv:
	rm -rf $(PYTHON_BACKEND_VENV)
