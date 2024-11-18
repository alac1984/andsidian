import { Plugin, Editor, TFile, parseYaml, stringifyYaml } from 'obsidian';

export default class Andsidian extends Plugin {

	async onload() {
		console.log('Plugin carregado.');

		this.registerEvent(
			this.app.workspace.on('editor-change', this.debounce(async (editor: Editor) => {

				const currentFile = this.app.workspace.getActiveFile();

				if(currentFile instanceof TFile) {
					// Leia o conteúdo do arquivo antes de processá-lo
					const content = await this.app.vault.read(currentFile);

					// Processar o frontmatter
					const { frontmatter, body } = this.extractFrontmatter(content);

					let frontmatterData: any = {};

					if (frontmatter) {
						// Remove os delimitadores '---'
						const yamlContent = frontmatter.replace(/(^---\s*\n?|\n?---$)/g, '');
						frontmatterData = parseYaml(yamlContent) || {};
					}

					console.log(frontmatterData);

					if(frontmatterData.pomodoros) {
						// Regex para detectar os pomodoros
						const regex = /\[🍅::\s*(\d+)\/(\d+)\]/g;

						// Somando os valores dos pomodoros
						let totalPomodorosDone = 0;
						let totalPomodorosPlanned = 0;

						let match;
						while ((match = regex.exec(content)) !== null) {
							const pomodorosDone = parseInt(match[1], 10);
							const pomodorosPlanned = parseInt(match[2], 10);

							totalPomodorosDone += pomodorosDone;
							totalPomodorosPlanned += pomodorosPlanned;
						}

						// Inserir as novas propriedades
						frontmatterData.pomodoros_planned = totalPomodorosPlanned || 0;
						frontmatterData.pomodoros_done = totalPomodorosDone || 0;

						// Reconstruir o frontmatter e o conteúdo da nota
						const newFrontmatter = '---\n' + stringifyYaml(frontmatterData) + '---\n\n';
						const newContent = newFrontmatter + body;

						// Escrever o conteúdo atualizado na nota
						await this.app.vault.modify(currentFile, newContent);
					}

					console.log('Editor modificado.');
				}

			}, 1000))
		);
	}

	onunload() {
		console.log('Plugin descarregado.');
	}

	debounce(func: (...args: any[]) => void, delay: number): (...args: any[]) => void {
		let timeout: number | undefined;
		return (...args: any[]) => {
			if (timeout) clearTimeout(timeout);
			timeout = window.setTimeout(() => {
				func(...args);
			}, delay);
		};
	}

	extractFrontmatter(content: string): { frontmatter: string; body: string } {
		if (content.startsWith('---')) {
			// Encontra o índice do segundo '---'
			const endIndex = content.indexOf('---', 3);
			if (endIndex !== -1) {
				const frontmatter = content.substring(0, endIndex + 3);
				const body = content.substring(endIndex + 3).trimStart();
				return { frontmatter, body };
			}
		}
		// Se não houver frontmatter, retorna strings vazias
		return { frontmatter: '', body: content };
	}
}
