// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Catalog } from './Catalog';
import { ProjectDetail } from './ProjectDetail';
import { api, examples } from '../services/api';

vi.mock('../auth/Auth', () => ({ useAuth: () => ({ user: { profile: {} }, groups: ['DONANTE'] }) }));
vi.mock('../auth/session', () => ({ authConfigured: true, login: vi.fn(), accessToken: async () => 'test-token' }));
vi.mock('../services/api', async importOriginal => {
  const original = await importOriginal<typeof import('../services/api')>();
  return { ...original, configured: true, api: { ...original.api, projects: vi.fn(async () => ({ items: original.examples })), project: vi.fn(async () => original.examples[0]), donate: vi.fn(), simulate: vi.fn() } };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('CA-NF06: flujos públicos y de donación', () => {
  it('HU-01 filtra proyectos y muestra vacío sin coincidencias', async () => {
    render(<MemoryRouter><Catalog /></MemoryRouter>);
    expect(await screen.findByText('Una mesa para todos')).toBeVisible();
    const search = screen.getByRole('textbox', { name: 'Buscar en los proyectos cargados' });
    fireEvent.change(search, { target: { value: 'aprender' } });
    expect(screen.getByText('Más oportunidades para aprender')).toBeVisible(); expect(screen.queryByText('Una mesa para todos')).toBeNull();
    fireEvent.change(search, { target: { value: 'sin coincidencias' } });
    expect(screen.getByText('No encontramos coincidencias.')).toBeVisible();
  });
  it('CA-05.4 conserva importe y clave en reintento tras error de red', async () => {
    vi.mocked(api.donate).mockRejectedValueOnce(new Error('Conexión interrumpida')).mockResolvedValueOnce({ donationId: 'test-donation', projectId: examples[0].projectId, amountCents: 5000, currency: 'PEN', status: 'PENDIENTE_SIMULACION', createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' });
    render(<MemoryRouter initialEntries={[`/proyectos/${examples[0].projectId}`]}><Routes><Route path="/proyectos/:id" element={<ProjectDetail />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Registrar aporte simulado/ }));
    expect(await screen.findByText('Conexión interrumpida')).toBeVisible();
    expect(screen.getByLabelText('¿Con cuánto quieres participar?')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar el mismo aporte/ }));
    expect(await screen.findByText('Intención registrada')).toBeVisible();
    expect(vi.mocked(api.donate).mock.calls[0]).toEqual(vi.mocked(api.donate).mock.calls[1]);
    expect(screen.getByText('Simulación académica: no se ha realizado ningún cobro')).toBeVisible();
  });
  it('CA-05.2 muestra error accesible y no envía montos con más de dos decimales', async () => {
    render(<MemoryRouter initialEntries={['/proyectos/example']}><Routes><Route path="/proyectos/:id" element={<ProjectDetail />} /></Routes></MemoryRouter>);
    const amount = await screen.findByLabelText('¿Con cuánto quieres participar?');
    fireEvent.change(amount, { target: { value: '1.999' } }); fireEvent.click(screen.getByRole('button', { name: /Registrar aporte simulado/ }));
    await waitFor(() => expect(amount).toHaveAttribute('aria-invalid', 'true'));
    expect(api.donate).not.toHaveBeenCalled();
  });
});
