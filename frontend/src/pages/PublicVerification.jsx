import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ToliaraLogo from '../components/ToliaraLogo';
import { demandesAPI } from '../services/api';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Info,
  ShieldCheck
} from 'lucide-react';

const PublicVerification = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery =
    searchParams.get('q') ||
    searchParams.get('code') ||
    '';

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
      const response =
        await demandesAPI.getPublicVerification(query.trim());

      setResult(response.data);
      setSearchParams({ q: query.trim() });
    } catch (error) {
      console.error(
        'Erreur lors de la vérification:',
        error
      );

      setResult({
        disponible: false,
        message:
          "Une erreur réseau s'est produite lors de la consultation. Veuillez réessayer."
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
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'Manrope, system-ui, sans-serif'
      }}
    >
      <header
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom:
            '1px solid rgba(226, 232, 240, 0.8)',
          padding: '1rem 2rem',
          boxShadow: 'var(--shadow-sm)',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <Link
            to="/"
            className="header-brand"
            style={{
              textDecoration: 'none',
              minWidth: 0
            }}
          >
            <ToliaraLogo size="medium" />
          </Link>

          <Link
            to="/"
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              padding: '0.5rem 1rem',
              borderRadius: '10px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Retour à l'accueil</span>
          </Link>
        </div>
      </header>

      <main
        style={{
          maxWidth: '800px',
          margin: '3.5rem auto',
          padding: '0 1.5rem'
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: '2.5rem'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1.1rem',
              borderRadius: '9999px',
              backgroundColor: '#e6f0f8',
              color: '#1d70b8',
              fontSize: '0.8rem',
              fontWeight: 800,
              marginBottom: '1.25rem',
              border:
                '1px solid rgba(29, 112, 184, 0.15)'
            }}
          >
            <ShieldCheck size={16} color="#1d70b8" />
            <span>
              Guichet Public de Vérification Officiel
            </span>
          </div>

          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              color: '#0a3641',
              marginBottom: '0.75rem',
              letterSpacing: '-0.02em'
            }}
          >
            Vérifier la disponibilité de mon diplôme
          </h1>

          <p
            style={{
              color: '#475569',
              fontSize: '1rem',
              fontWeight: 500
            }}
          >
            Saisissez votre <strong>Matricule étudiant</strong>{' '}
            (ex: TUL-2026-005), votre{' '}
            <strong>Nom / Prénom</strong>, ou le{' '}
            <strong>code de vérification</strong> imprimé sur
            le diplôme.
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: '2rem',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-md)',
            marginBottom: '2.25rem',
            border:
              '1px solid rgba(226, 232, 240, 0.8)'
          }}
        >
          <form
            onSubmit={handleSearch}
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}
          >
            <div
              style={{
                position: 'relative',
                flex: 1,
                minWidth: '260px'
              }}
            >
              <Search
                size={20}
                color="#94a3b8"
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              />

              <input
                type="text"
                placeholder="Exemple: TUL-2026-005 ou RANDRIA..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding:
                    '0.85rem 1rem 0.85rem 3rem',
                  fontSize: '1rem',
                  borderRadius: '12px',
                  border: '2px solid #cbd5e1',
                  outline: 'none',
                  transition: 'all 0.25s ease',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="btn btn-primary"
              style={{
                padding: '0.85rem 2rem',
                fontSize: '0.95rem',
                borderRadius: '12px',
                minWidth: '160px'
              }}
            >
              {loading ? 'Recherche...' : 'Vérifier'}
            </button>
          </form>
        </div>

        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 0'
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid #cbd5e1',
                borderTopColor: '#0a3641',
                borderRadius: '50%',
                animation:
                  'spin 0.8s linear infinite',
                margin: '0 auto 1.25rem'
              }}
            />

            <p
              style={{
                color: '#475569',
                fontWeight: 500
              }}
            >
              Consultation des registres de la
              Présidence de l'Université de Tuléar...
            </p>

            <style>{`
              @keyframes spin {
                100% {
                  transform: rotate(360deg);
                }
              }
            `}</style>
          </div>
        )}

        {!loading && hasSearched && result && (
          <div className="animate-fade-in">
            {result.disponible ? (
              <div
                className="card"
                style={{
                  border: '1px solid #10b981',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow:
                    '0 20px 40px rgba(16, 185, 129, 0.15)'
                }}
              >
                <div
                  style={{
                    backgroundColor: '#10b981',
                    backgroundImage:
                      'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    padding: '1.5rem 2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem'
                  }}
                >
                  <div
                    style={{
                      padding: '0.5rem',
                      background:
                        'rgba(255, 255, 255, 0.2)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <CheckCircle2 size={32} />
                  </div>

                  <div>
                    <h3
                      style={{
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        letterSpacing: '-0.01em'
                      }}
                    >
                      Votre Diplôme est Disponible !
                    </h3>

                    <p
                      style={{
                        fontSize: '0.875rem',
                        opacity: 0.9,
                        fontWeight: 500
                      }}
                    >
                      Prêt au retrait au Service des
                      Diplômes
                    </p>
                  </div>
                </div>

                <div style={{ padding: '2rem' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '1.25rem',
                      marginBottom: '2rem'
                    }}
                  >
                    <div
                      style={{
                        padding: '0.85rem 1.1rem',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border:
                          '1px solid #e2e8f0'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          fontWeight: 700,
                          display: 'block',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          marginBottom: '0.2rem'
                        }}
                      >
                        Matricule Étudiant
                      </span>

                      <strong
                        style={{
                          fontSize: '1.05rem',
                          color: '#0a3641'
                        }}
                      >
                        {result.matricule}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: '0.85rem 1.1rem',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border:
                          '1px solid #e2e8f0'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          fontWeight: 700,
                          display: 'block',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          marginBottom: '0.2rem'
                        }}
                      >
                        Nom & Prénom
                      </span>

                      <strong
                        style={{
                          fontSize: '1.05rem',
                          color: '#0a3641'
                        }}
                      >
                        {result.nom} {result.prenom}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: '0.85rem 1.1rem',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border:
                          '1px solid #e2e8f0'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          fontWeight: 700,
                          display: 'block',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          marginBottom: '0.2rem'
                        }}
                      >
                        Faculté / Établissement
                      </span>

                      <strong
                        style={{
                          fontSize: '0.95rem',
                          color: '#0a3641'
                        }}
                      >
                        {result.faculte}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: '0.85rem 1.1rem',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border:
                          '1px solid #e2e8f0'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          fontWeight: 700,
                          display: 'block',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          marginBottom: '0.2rem'
                        }}
                      >
                        Filière / Spécialité
                      </span>

                      <strong
                        style={{
                          fontSize: '0.95rem',
                          color: '#0a3641'
                        }}
                      >
                        {result.filiere}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: '0.85rem 1.1rem',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border:
                          '1px solid #e2e8f0'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          fontWeight: 700,
                          display: 'block',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          marginBottom: '0.2rem'
                        }}
                      >
                        Type de Diplôme
                      </span>

                      <strong
                        style={{
                          fontSize: '0.95rem',
                          color: '#1d70b8'
                        }}
                      >
                        {result.type_diplome}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: '0.85rem 1.1rem',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border:
                          '1px solid #e2e8f0'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          fontWeight: 700,
                          display: 'block',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          marginBottom: '0.2rem'
                        }}
                      >
                        Date de Disponibilité
                      </span>

                      <strong
                        style={{
                          fontSize: '0.95rem',
                          color: '#10b981'
                        }}
                      >
                        {result.date_disponibilite}
                      </strong>
                    </div>

                    {result.numero_diplome && (
                      <div
                        style={{
                          padding:
                            '0.75rem 1rem',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border:
                            '1px solid #e2e8f0'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                            display: 'block'
                          }}
                        >
                          Numéro de Diplôme
                        </span>

                        <strong
                          style={{
                            fontSize: '0.95rem',
                            color: '#070b19'
                          }}
                        >
                          {result.numero_diplome}
                        </strong>
                      </div>
                    )}

                    {result.mention && (
                      <div
                        style={{
                          padding:
                            '0.75rem 1rem',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border:
                            '1px solid #e2e8f0'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                            display: 'block'
                          }}
                        >
                          Mention
                        </span>

                        <strong
                          style={{
                            fontSize: '0.95rem',
                            color: '#070b19'
                          }}
                        >
                          {result.mention}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      padding: '1.5rem',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1.1rem',
                      color: '#14532d'
                    }}
                  >
                    <Info
                      size={24}
                      color="#16a34a"
                      style={{
                        flexShrink: 0,
                        marginTop: '2px'
                      }}
                    />

                    <div>
                      <h4
                        style={{
                          fontWeight: 800,
                          fontSize: '1rem',
                          marginBottom: '0.35rem',
                          color: '#14532d'
                        }}
                      >
                        Consigne de Retrait :
                      </h4>

                      <p
                        style={{
                          fontSize: '0.9rem',
                          lineHeight: 1.6,
                          fontWeight: 500
                        }}
                      >
                        {result.message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="card"
                style={{
                  border: '1px solid #f59e0b',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow:
                    '0 20px 40px rgba(245, 158, 11, 0.15)'
                }}
              >
                <div
                  style={{
                    backgroundColor: '#f59e0b',
                    backgroundImage:
                      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#ffffff',
                    padding: '1.5rem 2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem'
                  }}
                >
                  <div
                    style={{
                      padding: '0.5rem',
                      background:
                        'rgba(255, 255, 255, 0.2)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Clock size={32} />
                  </div>

                  <div>
                    <h3
                      style={{
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        letterSpacing: '-0.01em'
                      }}
                    >
                      Diplôme en cours d'instruction
                    </h3>

                    <p
                      style={{
                        fontSize: '0.875rem',
                        opacity: 0.9,
                        fontWeight: 500
                      }}
                    >
                      Circuit administratif non finalisé
                    </p>
                  </div>
                </div>

                <div style={{ padding: '2rem' }}>
                  {result.matricule && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1.25rem',
                        marginBottom: '1.75rem'
                      }}
                    >
                      <div
                        style={{
                          padding: '0.85rem 1.1rem',
                          background: '#f8fafc',
                          borderRadius: '12px',
                          border:
                            '1px solid #e2e8f0'
                        }}
                      >
                        <span
                          style={{
                            color: '#64748b',
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            marginBottom: '0.2rem'
                          }}
                        >
                          Dossier concerné :
                        </span>

                        <strong
                          style={{
                            color: '#0a3641',
                            fontSize: '0.95rem'
                          }}
                        >
                          {result.nom} {result.prenom} (
                          {result.matricule})
                        </strong>
                      </div>

                      <div
                        style={{
                          padding: '0.85rem 1.1rem',
                          background: '#f8fafc',
                          borderRadius: '12px',
                          border:
                            '1px solid #e2e8f0'
                        }}
                      >
                        <span
                          style={{
                            color: '#64748b',
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            marginBottom: '0.2rem'
                          }}
                        >
                          Étape actuelle :
                        </span>

                        <strong
                          style={{
                            color: '#1d70b8',
                            fontSize: '0.95rem'
                          }}
                        >
                          {result.statut_display ||
                            'En cours de validation'}
                        </strong>
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      padding: '1.5rem',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fef08a',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1.1rem',
                      color: '#78350f'
                    }}
                  >
                    <AlertTriangle
                      size={24}
                      color="#d97706"
                      style={{
                        flexShrink: 0,
                        marginTop: '2px'
                      }}
                    />

                    <div>
                      <h4
                        style={{
                          fontWeight: 800,
                          fontSize: '1rem',
                          marginBottom: '0.35rem',
                          color: '#78350f'
                        }}
                      >
                        Information Importante :
                      </h4>

                      <p
                        style={{
                          fontSize: '0.9rem',
                          lineHeight: 1.6,
                          fontWeight: 500
                        }}
                      >
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