// eslint.config.mjs
// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from "eslint/config";
import tseslint from 'typescript-eslint';
import vitest from "eslint-plugin-vitest";
import suggestMembers from "@ton-ai-core/eslint-plugin-suggest-members";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import * as effectEslint from "@effect/eslint-plugin";
import { fixupPluginRules } from "@eslint/compat";
import codegen from "eslint-plugin-codegen";
import importPlugin from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sortDestructureKeys from "eslint-plugin-sort-destructure-keys";
import globals from "globals";
import eslintCommentsConfigs from "@eslint-community/eslint-plugin-eslint-comments/configs";
import exampleTypedLinting from "@effect-template/eslint-template";

const codegenPlugin = fixupPluginRules(
	codegen as unknown as Parameters<typeof fixupPluginRules>[0],
);

// CHANGE: use ESLint defineConfig now that plugin configs align with @eslint/core types
// WHY: tseslint.config is deprecated; config typing moved to ESLint core helpers
// QUOTE(ТЗ): "The signature ... of 'tseslint.config' is deprecated."
// REF: user request 2025-12-25
// SOURCE: n/a
// FORMAT THEOREM: ∀c ∈ Configs: compatible(c, @eslint/core) → assignable(c, defineConfig)
// PURITY: SHELL
// EFFECT: n/a
// INVARIANT: exported value is a flat config array with stable ordering
// COMPLEXITY: O(1)/O(1)
export default defineConfig(
  exampleTypedLinting.configs.recommended,
  {
    name: "analyzers",
    languageOptions: {
      parser: tseslint.parser,
	  globals: { ...globals.node, ...globals.browser },
      parserOptions: {
        projectService: true,          
        tsconfigRootDir: import.meta.dirname,
      },
    },
	files: ["**/*.ts", '**/*.{test,spec}.{ts,tsx}', '**/tests/**', '**/__tests__/**'],
	settings: {
		"import/parsers": {
			"@typescript-eslint/parser": [".ts", ".tsx"],
		},
		"import/resolver": {
			typescript: {
				alwaysTryTypes: true,
			},
		},
	},
  },
  // 3) Для JS-файлов отключим типо-зависимые проверки
  {
    files: ['**/*.{js,cjs,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // 4) Глобальные игноры
  { ignores: ['dist/**', 'build/**', 'coverage/**', '**/dist/**'] },
);
