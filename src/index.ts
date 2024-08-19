/* eslint-disable n/no-process-env */
import z from 'zod'

declare let process: {
  env: Record<string, string>
}

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export const createEnvThings = <T extends z.ZodObject<any>>({
  schema,
  source,
  name,
}: {
  schema: T
  source: any
  name: string
}) => {
  const isLocalHostEnv = () => source.HOST_ENV === 'local'
  const isNotHostEnv = () => source.HOST_ENV !== 'local'
  const isDevHostEnv = () => source.HOST_ENV === 'dev'
  const isStageHostEnv = () => source.HOST_ENV === 'stage'
  const isProdHostEnv = () => source.HOST_ENV === 'prod'
  const isProductionNodeEnv = () => source.NODE_ENV === 'production'
  const isTestNodeEnv = () => source.NODE_ENV === 'test'
  const isDevelopmentNodeEnv = () => source.NODE_ENV === 'development'
  const helpers = {
    isLocalHostEnv,
    isNotHostEnv,
    isDevHostEnv,
    isStageHostEnv,
    isProdHostEnv,
    isProductionNodeEnv,
    isTestNodeEnv,
    isDevelopmentNodeEnv,
  }

  const getAllEnv = () => {
    const parseResult = schema.safeParse(source)
    if (!parseResult.success) {
      throw new Error(`Invalid environment variables ${name}: ${JSON.stringify(parseResult.error.errors)}`)
    }
    const allEnv = parseResult.data as z.infer<T>
    return {
      ...allEnv,
      ...helpers,
    }
  }

  const getOneEnv = <K extends keyof z.input<T>>(key: K) => {
    const cuttedSchema = (schema as any).pick({ [key]: true })
    const cuttedSource = { [key]: source[key] }
    const parseResult = cuttedSchema.safeParse(cuttedSource)
    if (!parseResult.success) {
      throw new Error(`Invalid environment variables ${name}: ${JSON.stringify(parseResult.error.errors)}`)
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
      throw new Error(`Invalid environment variables ${name}: ${JSON.stringify(parseResult.error.errors)}`)
    }
    return parseResult.data as Prettify<Pick<z.infer<T>, K>>
  }

  return {
    getAllEnv,
    getOneEnv,
    getSomeEnv,
    ...helpers,
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
export const zHostEnv = z.enum(['local', 'dev', 'stage', 'prod'])
export const zEnv = z.string().trim()
export const zEnvOptional = zEnv.optional()
export const zEnvRequired = zEnv.refine((val) => !!val, 'Required')
export const zEnvRequiredOnNotLocalHost = zEnvOptional.refine(
  (val) => `${process.env.HOST_ENV}` === 'local' || !!val,
  'Required on not local host env'
)
export const zEnvRequiredOnProductionHost = zEnvOptional.refine(
  (val) => `${process.env.HOST_ENV}` === 'prod' || !!val,
  'Required on prod host env'
)
export const zEnvBoolean = z.enum(['true', 'false', '1', '0']).transform((val) => val === 'true' || val === '1')
export const zEnvNumber = z.union([
  z
    .string()
    .refine((val) => !isNaN(Number(val)), 'Not a number')
    .transform(Number),
  z.number(),
])
export const zEnvInt = zEnvNumber.refine((val) => Number.isInteger(val), 'Not an integer')
