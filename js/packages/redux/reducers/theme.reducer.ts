import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { randomizeThemeColor } from '@berty-tech/styles'
import defaultTheme from '@berty-tech/styles/colors.json'
import pinkTheme from '@berty-tech/styles/pinktheme-default.json'
import darkTheme from '@berty-tech/styles/darktheme-default.json'
import darkLFTheme from '@berty-tech/styles/DarkLF-theme.json'

/**
 *
 * State
 *
 */

export const sliceName = 'theme'

enum AVAILABLE_THEMES {
	DEFAULT_BERTY_THEME = 'default-berty-theme',
	CURRENT_GENERATED_THEME = 'current-generated',
	DEFAULT_PINK_THEME = 'pink-theme',
	DEFAULT_DARK_THEME = 'dark-theme',
	DEFAULT_LF_THEME = 'dark-lf-theme',
}

export type ThemeType = {
	'main-text': string
	'main-background': string
	'secondary-text': string
	'background-header': string
	'secondary-background-header': string
	'alt-secondary-background-header': string
	'reverted-main-text': string
	'positive-asset': string
	'negative-asset': string
	'warning-asset': string
	'input-background': string
	shadow: string
}
export type ThemeDefinition = { colors: ThemeType }

export type ThemeCollectionType = Partial<Record<AVAILABLE_THEMES | string, ThemeDefinition>>

export type ThemeState = {
	selected: keyof AVAILABLE_THEMES | string
	collection: ThemeCollectionType
	isDark: boolean
}

const makeRoot = <T>(val: T) => ({
	[sliceName]: val,
})

const initialState: ThemeState = {
	selected: AVAILABLE_THEMES.DEFAULT_BERTY_THEME,
	collection: {
		[AVAILABLE_THEMES.DEFAULT_BERTY_THEME]: { colors: defaultTheme },
		[AVAILABLE_THEMES.CURRENT_GENERATED_THEME]: { colors: randomizeThemeColor() },
		[AVAILABLE_THEMES.DEFAULT_PINK_THEME]: { colors: pinkTheme },
		[AVAILABLE_THEMES.DEFAULT_DARK_THEME]: { colors: darkTheme },
		[AVAILABLE_THEMES.DEFAULT_LF_THEME]: { colors: darkLFTheme },
	},
	isDark: false,
}

const rootInitialState = makeRoot<ThemeState>(initialState)
type LocalRootState = typeof rootInitialState

/**
 *
 * Selectors
 *
 */

const selectSlice = (state: LocalRootState) => state[sliceName]

export const selectThemeSelected = (state: LocalRootState) => selectSlice(state).selected as string

export const selectThemeCollection = (state: LocalRootState) => selectSlice(state).collection

export const selectThemeIsDark = (state: LocalRootState) => selectSlice(state).isDark

export const selectCurrentTheme = (state: LocalRootState) =>
	selectSlice(state).isDark
		? AVAILABLE_THEMES.DEFAULT_DARK_THEME
		: (selectSlice(state).selected as string)

export const selectThemeCollectionAsItem = (state: LocalRootState) =>
	Object.entries(selectSlice(state).collection).map((value, _) => {
		return {
			label: value[0],
			value: value[1],
		}
	}) as any

/**
 *
 * Actions
 *
 */

const slice = createSlice({
	name: sliceName,
	initialState,
	reducers: {
		toggleDarkTheme(theme: ThemeState) {
			theme.isDark = !theme.isDark
		},
		setTheme(
			theme: ThemeState,
			{ payload: { themeName } }: PayloadAction<{ themeName: keyof AVAILABLE_THEMES | string }>,
		) {
			if (themeName === AVAILABLE_THEMES.DEFAULT_DARK_THEME) {
				theme.isDark = true
				return
			}
			theme.selected = themeName
			theme.isDark = false
		},
		randomizeTheme(theme: ThemeState) {
			theme.selected = AVAILABLE_THEMES.CURRENT_GENERATED_THEME
			theme.collection[AVAILABLE_THEMES.CURRENT_GENERATED_THEME]!.colors = randomizeThemeColor()
		},
		saveTheme(theme: ThemeState, { payload: { themeName } }: PayloadAction<{ themeName: string }>) {
			theme.selected = themeName
			theme.collection[themeName] = {
				colors: theme.collection[AVAILABLE_THEMES.CURRENT_GENERATED_THEME]!.colors,
			}
			theme.isDark = false
		},
		importTheme(
			theme: ThemeState,
			{ payload: { themeName, colors } }: PayloadAction<{ themeName: string; colors: ThemeType }>,
		) {
			theme.selected = themeName
			theme.collection[themeName] = { colors }
			theme.isDark = false
		},
		deleteAddedThemes(theme: ThemeState) {
			theme.selected = AVAILABLE_THEMES.DEFAULT_BERTY_THEME
			Object.keys(theme.collection).forEach((currentTheme: keyof AVAILABLE_THEMES | string) => {
				if (!(<any>Object).values(AVAILABLE_THEMES).includes(currentTheme)) {
					delete theme.collection[currentTheme as string]
				}
			})
		},
		resetTheme() {
			return initialState
		},
	},
})

export const {
	toggleDarkTheme,
	setTheme,
	randomizeTheme,
	saveTheme,
	importTheme,
	deleteAddedThemes,
	resetTheme,
} = slice.actions

export default makeRoot(slice.reducer)
