## Démarrage

- Prérequis : Node.js et npm (pour le front), Python 3 et pip (pour le back), et Docker si vous utilisez Docker Compose.

- Démarrer uniquement le frontend (mode développement) :

	1. Ouvrir un terminal dans le dossier `frontend`.
	2. Installer les dépendances :

	```bash
	npm install
	```

	3. Lancer le serveur Vite :

	```bash
	npm run dev
	```

	Le frontend sera disponible sur http://localhost:5173.

- Démarrer uniquement le backend (mode développement) :

	1. Ouvrir un terminal dans le dossier `backend`.
	2. Installer les dépendances :

	```bash
	pip install -r requirements.txt
	```

	3. Lancer le serveur Uvicorn (développement) :

	```bash
	uvicorn main:app --host 0.0.0.0 --port 8000 --reload
	```

	L'API sera disponible sur http://localhost:8000.

- Démarrer les deux services avec Docker Compose :

	```bash
	# depuis la racine du projet
	docker compose up --build
	# ou pour détacher
	docker compose up -d --build
	```

- Construire et prévisualiser le frontend en production :

	```bash
	cd frontend
	npm run build
	npm run preview
	```

Si vous avez besoin que j'ajoute des instructions supplémentaires (ex. variables d'environnement, endpoints d'API, ou commandes Windows spécifiques), dites-le-moi.
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
