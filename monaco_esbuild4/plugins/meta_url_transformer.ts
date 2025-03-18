import type esbuild from "esbuild"
import { getBuildExtensions } from "esbuild-extra"


export interface MetaUrlTransformerPluginSetup {
	pluginName: string
}

const defaultMetaUrlTransformerPluginSetup: MetaUrlTransformerPluginSetup = {
	pluginName: "oazmi-meta-url-resolver",
}

const metaUrlTransformerPluginSetup = (config?: Partial<MetaUrlTransformerPluginSetup>) => {
	const { pluginName } = { ...defaultMetaUrlTransformerPluginSetup, ...config }

	return async (build: esbuild.PluginBuild) => {
		const
			superBuild = getBuildExtensions(build, pluginName),
			meta_url_pattern = /new\s+URL\(\s*(?<quote>["'])(?<importPath>.*?)\k<quote>,\s*import\.meta\.url\s*\)/g

		superBuild.onTransform({ loaders: ["ts", "tsx", "js", "jsx"] }, async (args) => {
			const { loader, code } = args
			if (!code.match(meta_url_pattern)) { return }

			let var_counter = 0
			const
				additional_imports: Array<{ varName: string, pathName: string }> = [],
				modified_code = code.replaceAll(meta_url_pattern, (_full_match, ...args): string => {
					const
						[named_groups, _full_string, _offset, ..._unused_groups] = args.toReversed(),
						pathName = named_groups.importPath as string,
						varName = `__WORKER_URL_${var_counter++}`
					additional_imports.push({ varName, pathName })
					return varName
				}),
				worker_url_import_statements = additional_imports.map(({ varName, pathName }) => {
					return `import ${varName} from "${pathName}" with { type: "monaco-worker" }`
				})

			return {
				loader: loader,
				code: worker_url_import_statements.join("\n") + "\n" + modified_code,
			}
		})
	}
}

export const metaUrlTransformerPlugin = (config?: Partial<MetaUrlTransformerPluginSetup>) => {
	return {
		name: config?.pluginName ?? defaultMetaUrlTransformerPluginSetup.pluginName,
		setup: metaUrlTransformerPluginSetup(config),
	}
}
