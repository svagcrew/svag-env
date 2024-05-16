/* eslint-disable @typescript-eslint/ban-types */
import z from 'zod'

declare let process: {
  env: Record<string, string>
}

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export const createEnvThings = <T extends z.ZodObject<any>>({ schema, source }: { schema: T; source: any }) => {
  const getAllEnv = () => {
    const parseResult = schema.safeParse(source)
    if (!parseResult.success) {
      throw new Error(`Invalid environment variables: ${JSON.stringify(parseResult.error.errors)}`)
    }
    return parseResult.data as z.infer<T>
  }

  const getOneEnv = <K extends keyof z.input<T>>(key: K) => {
    const cuttedSchema = (schema as any).pick({ [key]: true })
    const cuttedSource = { [key]: source[key] }
    const parseResult = cuttedSchema.safeParse(cuttedSource)
    if (!parseResult.success) {
      throw new Error(`Invalid environment variables: ${JSON.stringify(parseResult.error.errors)}`)
    }
    return parseResult.data[key] as z.infer<T>[K]
  }

  const getSomeEnv = <K extends keyof z.input<T>>(keys: K[] | Record<K, true>) => {
    const keyTrueRecord = (() => {
      if (Array.isArray(keys)) {
        return keys.reduce(
          (acc, key) => {
            acc[key] = true
            return acc
          },
          {} as Record<K, true>
        )
      }
      return keys
    })()
    const keysArray = Object.keys(keyTrueRecord) as K[]
    const cuttedSchema = (schema as any).pick(keyTrueRecord)
    const cuttedSource = keysArray.reduce(
      (acc, key) => {
        acc[key] = source[key]
        return acc
      },
      {} as Record<K, any>
    )
    const parseResult = cuttedSchema.safeParse(cuttedSource)
    if (!parseResult.success) {
      throw new Error(`Invalid environment variables: ${JSON.stringify(parseResult.error.errors)}`)
    }
    return parseResult.data as Prettify<Pick<z.infer<T>, K>>
  }

  return {
    getAllEnv,
    getOneEnv,
    getSomeEnv,
  }
}

export const parsePublicEnv = ({
  source,
  publicPrefix = 'PUBLIC_ENV__',
  publicKeys = ['NODE_ENV', 'HOST_ENV', 'SOURCE_VERSION'],
}: {
  source: Record<string, string | undefined>
  publicPrefix?: string
  publicKeys?: string[]
}) =>
  Object.entries(source).reduce((acc, [key, value]) => {
    if (key.startsWith(publicPrefix) || publicKeys.includes(key)) {
      return {
        ...acc,
        [key]: value,
      }
    }
    return acc
  }, {})

export const zNodeEnv = z.enum(['development', 'production', 'test'])
export const zHostEnv = z.enum(['local', 'development', 'staging', 'production'])
export const zEnv = z.string().trim()
export const zEnvOptional = zEnv.optional()
export const zEnvRequired = zEnv.refine((val) => !!val, 'Required')
export const zEnvRequiredOnNotLocalHost = zEnvOptional.refine(
  (val) => `${process?.env?.HOST_ENV}` === 'local' || !!val,
  'Required on not local host'
)
export const zEnvRequiredOnProductionHost = zEnvOptional.refine(
  (val) => `${process?.env?.HOST_ENV}` === 'production' || !!val,
  'Required on production node env'
)
export const zEnvBoolean = z.enum(['true', 'false', '1', '0']).transform((val) => val === 'true' || val === '1')
export const zEnvNumber = z
  .string()
  .refine((val) => !isNaN(Number(val)), 'Not a number')
  .transform(Number)
