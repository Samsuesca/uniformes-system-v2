import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * YomberMeasurementsForm - Form for capturing yomber custom measurements
 */
import { AlertCircle, ChevronDown, ChevronUp, Ruler } from 'lucide-react';
import { useState } from 'react';
// Required fields for yomber
const REQUIRED_FIELDS = [
    { key: 'delantero', label: 'Talle Delantero', placeholder: 'ej: 40' },
    { key: 'trasero', label: 'Talle Trasero', placeholder: 'ej: 42' },
    { key: 'cintura', label: 'Cintura', placeholder: 'ej: 28' },
    { key: 'largo', label: 'Largo', placeholder: 'ej: 75' },
];
// Optional fields
const OPTIONAL_FIELDS = [
    { key: 'espalda', label: 'Espalda', placeholder: 'cm' },
    { key: 'cadera', label: 'Cadera', placeholder: 'cm' },
    { key: 'hombro', label: 'Hombro', placeholder: 'cm' },
    { key: 'pierna', label: 'Pierna', placeholder: 'cm' },
    { key: 'entrepierna', label: 'Entrepierna', placeholder: 'cm' },
    { key: 'manga', label: 'Manga', placeholder: 'cm' },
    { key: 'cuello', label: 'Cuello', placeholder: 'cm' },
    { key: 'pecho', label: 'Pecho', placeholder: 'cm' },
    { key: 'busto', label: 'Busto', placeholder: 'cm' },
    { key: 'tiro', label: 'Tiro', placeholder: 'cm' },
];
export default function YomberMeasurementsForm({ measurements, onChange, errors = {}, disabled = false, }) {
    const [showOptional, setShowOptional] = useState(false);
    const handleChange = (key, value) => {
        const numValue = value === '' ? undefined : parseFloat(value);
        onChange({
            ...measurements,
            [key]: numValue,
        });
    };
    const hasRequiredErrors = REQUIRED_FIELDS.some(f => errors[f.key]);
    return (_jsxs("div", { className: "bg-purple-50 border border-purple-200 rounded-lg p-4", children: [_jsxs("div", { className: "flex items-center mb-3", children: [_jsx(Ruler, { className: "w-5 h-5 text-purple-600 mr-2" }), _jsx("h4", { className: "font-medium text-purple-900", children: "Medidas del Yomber" })] }), hasRequiredErrors && (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded p-2 mb-3 flex items-start", children: [_jsx(AlertCircle, { className: "w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" }), _jsx("p", { className: "text-sm text-red-700", children: "Completa todas las medidas obligatorias" })] })), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4", children: REQUIRED_FIELDS.map((field) => (_jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-medium text-purple-700 mb-1", children: [field.label, " ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: "number", min: "0", step: "0.5", value: measurements[field.key] ?? '', onChange: (e) => handleChange(field.key, e.target.value), placeholder: field.placeholder, disabled: disabled, className: `w-full px-3 py-2 border rounded-lg text-sm pr-10 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none ${errors[field.key]
                                        ? 'border-red-300 bg-red-50'
                                        : 'border-gray-300'} ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}` }), _jsx("span", { className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs", children: "cm" })] }), errors[field.key] && (_jsx("p", { className: "text-xs text-red-600 mt-1", children: errors[field.key] }))] }, field.key))) }), _jsxs("button", { type: "button", onClick: () => setShowOptional(!showOptional), disabled: disabled, className: "flex items-center text-sm text-purple-600 hover:text-purple-800 transition", children: [showOptional ? (_jsx(ChevronUp, { className: "w-4 h-4 mr-1" })) : (_jsx(ChevronDown, { className: "w-4 h-4 mr-1" })), showOptional ? 'Ocultar medidas opcionales' : 'Mostrar medidas opcionales'] }), showOptional && (_jsx("div", { className: "grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 pt-3 border-t border-purple-200", children: OPTIONAL_FIELDS.map((field) => (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600 mb-1", children: field.label }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: "number", min: "0", step: "0.5", value: measurements[field.key] ?? '', onChange: (e) => handleChange(field.key, e.target.value), placeholder: field.placeholder, disabled: disabled, className: `w-full px-3 py-1.5 border border-gray-300 rounded text-sm pr-8 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}` }), _jsx("span", { className: "absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs", children: "cm" })] })] }, field.key))) })), _jsx("p", { className: "text-xs text-purple-600 mt-3", children: "* Las medidas marcadas son obligatorias para encargos de yomber" })] }));
}
// Helper function to validate yomber measurements
export function validateYomberMeasurements(measurements) {
    const errors = {};
    if (!measurements) {
        REQUIRED_FIELDS.forEach((field) => {
            errors[field.key] = 'Requerido';
        });
        return { valid: false, errors };
    }
    REQUIRED_FIELDS.forEach((field) => {
        const value = measurements[field.key];
        if (value === undefined || value === null) {
            errors[field.key] = 'Requerido';
        }
        else if (value <= 0) {
            errors[field.key] = 'Debe ser mayor a 0';
        }
    });
    return { valid: Object.keys(errors).length === 0, errors };
}
