/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'inter': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                'space-grotesk': ['"Space Grotesk"', 'sans-serif'],
            },
            colors: {
                'neo': {
                    'bg-primary': '#E0E7FF',
                    'bg-secondary': '#EEF2FF',
                    'bg-card': '#FFFFFF',
                    'accent-primary': '#818CF8',
                    'accent-secondary': '#F472B6',
                    'accent-tertiary': '#FDE047',
                }
            },
            boxShadow: {
                'hard': '6px 6px 0 #000000',
                'hard-sm': '3px 3px 0 #000000',
                'hard-lg': '10px 10px 0 #000000',
            },
            borderWidth: {
                '3': '3px',
            }
        },
    },
    plugins: [],
}
