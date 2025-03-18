import esbuild from "esbuild"
import fs from "node:fs/promises"
import { metaUrlTransformerPlugin } from "./plugins/meta_url_transformer.ts"
import { workerBundlerPlugin } from "./plugins/worker_bundler.ts"


const emptyDir = async (dir_path: string): Promise<void> => {
	try {
		const dir_exists = (await fs.stat(dir_path)).isDirectory()
		if (dir_exists) { await fs.rm(dir_path, { recursive: true }) }
	} catch (error: any) { }
	await fs.mkdir(dir_path)
}

const dist_dir = "./dist/"
await emptyDir(dist_dir)
await esbuild.build({
	entryPoints: [
		"./src/index.ts",
		"./src/index.html",
	],
	plugins: [
		metaUrlTransformerPlugin(),
		workerBundlerPlugin({
			filters: [/.*/],
			// below, we specify that only `import ... from "..." with { type: "monaco-worker" }` should be processed.
			withFilter: (with_arg) => (with_arg.type === "monaco-worker"),
		}),
	],
	loader: {
		".ttf": "copy", // <-- this loader-rule is crucial for bundling the monaco-editor.
		".html": "copy", // <-- this allows us to copy the "./src/index.html" file as is.
		".txt": "file", // <-- needed for the file-path import performed by the "./src/demo_worker.ts" worker file.
	},
	outdir: dist_dir,
	// outfile: "./dist/index.js", // if you only have a single entry-point, you can specify `outfile` instead of `outdir`.
	// asset-names MUST be specified, and it may NOT contain the "[hash]" label, because that will break the references generated in the sub-build.
	assetNames: "assets/[name]", // another good possibility is `"[ext]/[name]"`, but then sourcemaps will not work in that one.
	format: "esm",
	bundle: true,
	splitting: false,
	minifySyntax: true,
	platform: "browser",
	sourcemap: true,
	write: true,
})

console.log("bundled your monaco-editor page successfully!")
console.log("you may now run a local server to check it out:")
console.log("\t>> npm run serve")
