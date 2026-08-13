import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TulearLogo from '../components/TulearLogo';
import { demandesAPI } from '../services/api';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  User, 
  GraduationCap, 
  Building, 
  Calendar, 
  ArrowLeft,
  Info,
  ShieldCheck
} from 'lucide-react';

const PublicVerification = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await demandesAPI.getPublicVerification(query.trim());
      setResult(response.data);
      setSearchParams({ q: query.trim() });
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      setResult({
        disponible: false,
        message: "Une erreur réseau s'est produite lors de la consultation. Veuillez réessayer."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch();
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Top Header */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '1rem 2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <TulearLogo size="medium" />
          </Link>
          <Link to="/" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <ArrowLeft size={16} />
            <span>Retour à l'accueil</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '800px', margin: '3rem auto', padding: '0 1.5rem' }}>
        
        {/* Search Header Banner */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.9rem',
            borderRadius: '9999px',
            backgroundColor: '#e6f0f3',
            color: '#0a3641',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '1rem'
          }}>
            <ShieldCheck size={16} color="#0a3641" />
            <span>Guichet Public de Vérification Officiel</span>
          </div>

          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0a3641', marginBottom: '0.75rem' }}>
            Vérifier la disponibilité de mon diplôme
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>
            Saisissez votre <strong>Matricule étudiant</strong> (ex: TUL-2026-005) ou votre <strong>Nom / Prénom</strong>.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="card" style={{ padding: '1.75rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Exemple: TUL-2026-005 ou RANDRIA Tojo..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 2.75rem',
                  fontSize: '1rem',
                  borderRadius: '10px',
                  border: '2px solid #cbd5e1',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="btn btn-primary"
              style={{
                padding: '0.85rem 1.75rem',
                fontSize: '0.95rem',
                borderRadius: '10px',
                minWidth: '160px'
              }}
            >
              {loading ? 'Recherche...' : 'Vérifier'}
            </button>
          </form>
        </div>

        {/* Results Presentation Area */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #cbd5e1', borderTopColor: '#0a3641', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            <p style={{ color: '#64748b' }}>Consultation des registres de la Présidence de l'Université de Tuléar...</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && hasSearched && result && (
          <div className="animate-fade-in">
            {result.disponible ? (
              
              /* Available Result Card */
              <div className="card" style={{ border: '2px solid #10b981', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(16, 185, 129, 0.12)' }}>
                
                {/* Available Banner Header */}
                <div style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '1.25rem 1.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <CheckCircle2 size={32} />
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Votre Diplôme est Disponible !</h3>
                    <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>Prêt au retrait au Service des Diplômes</p>
                  </div>
                </div>

                <div style={{ padding: '1.75rem' }}>
                  
                  {/* Detailed Student Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
                    
                    <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Matricule Étudiant</span>
                      <strong style={{ fontSize: '1rem', color: '#0a3641' }}>{result.matricule}</strong>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Nom & Prénom</span>
                      <strong style={{ fontSize: '1rem', color: '#0a3641' }}>{result.nom} {result.prenom}</strong>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Faculté / Établissement</span>
                      <strong style={{ fontSize: '0.95rem', color: '#0a3641' }}>{result.faculte}</strong>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Filière / Spécialité</span>
                      <strong style={{ fontSize: '0.95rem', color: '#0a3641' }}>{result.filiere}</strong>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Type de Diplôme</span>
                      <strong style={{ fontSize: '0.95rem', color: '#1d70b8' }}>{result.type_diplome}</strong>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Date de Disponibilité</span>
                      <strong style={{ fontSize: '0.95rem', color: '#10b981' }}>{result.date_disponibilite}</strong>
                    </div>

                  </div>

                  {/* Mandated Official Instruction Message */}
                  <div style={{
                    padding: '1.25rem',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    color: '#065f46'
                  }}>
                    <Info size={24} color="#059669" style={{ shrink: 0, marginTop: '2px' }} />
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Consigne de Retrait :</h4>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.5, fontWeight: 500 }}>
                        {result.message}
                      </p>
                    </div>
                  </div>

                </div>

              </div>

            ) : (

              /* Not Yet Available Result Card */
              <div className="card" style={{ border: '2px solid #f59e0b', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(245, 158, 11, 0.12)' }}>
                
                <div style={{ backgroundColor: '#f59e0b', color: '#ffffff', padding: '1.25rem 1.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Clock size={32} />
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Diplôme en cours d'instruction</h3>
                    <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>Circuit administratif non finalisé</p>
                  </div>
                </div>

                <div style={{ padding: '1.75rem' }}>
                  
                  {result.matricule && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748b', display: 'block' }}>Dossier concerné:</span>
                        <strong>{result.nom} {result.prenom} ({result.matricule})</strong>
                      </div>
                      <div style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748b', display: 'block' }}>Étape actuelle:</span>
                        <strong style={{ color: '#1d70b8' }}>{result.statut_display || 'En cours de validation'}</strong>
                      </div>
                    </div>
                  )}

                  <div style={{
                    padding: '1.25rem',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    color: '#92400e'
                  }}>
                    <AlertTriangle size={24} color="#d97706" style={{ shrink: 0, marginTop: '2px' }} />
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Information Importante :</h4>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.5, fontWeight: 500 }}>
                        {result.message}
                      </p>
                    </div>
                  </div>

                </div>

              </div>

            )}
          </div>
        )}

      </main>

    </div>
  );
};

export default PublicVerification;
