// src/components/pages/TryOnPage.jsx
import React, { useState, useRef, useCallback, useMemo } from 'react';
import Scene from '../3d/Scene';
import GenderSelector from '../TryOn/GenderSelector';
import ClothingSidebar from '../TryOn/ClothingSidebar';
import MeasurementPanel from '../TryOn/MeasurementPanel';
import SaveNotification from '../TryOn/SaveNotification';
import SceneOverlay from '../TryOn/SceneOverlay';
import SimilarLooksRow from '../TryOn/SimilarLooksRow';
import AuthPage from './AuthPage';
import { useBodyMeasurements } from '../../hooks/useBodyMeasurements';
import { useGarmentUpload } from '../../hooks/useGarmentUpload';
import { useUnitConversion } from '../../hooks/useUnitConversion';
import { useNotification } from '../../hooks/useNotification';
import garmentTemplateService from '../../services/garmentTemplateService';
import { useSaveOutfit } from '../../hooks/useSaveOutfit';
import SaveOutfitDialog from '../TryOn/SaveOutfitDialog';
import { DEFAULT_EASE_FACTOR } from '../../utils/GarmentFitter';

const UPPER_SLOT = 'upper';
const LOWER_SLOT = 'lower';
const LOWER_TYPES = new Set(['pants', 'skirt', 'shorts', 'trousers', 'jeans', 'leggings']);
const slotForType = (type) => LOWER_TYPES.has(type?.toLowerCase()) ? LOWER_SLOT : UPPER_SLOT;

const AuthModal = ({ onClose, onAuthSuccess }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative z-10 w-full max-w-5xl h-[90vh] max-h-[620px] rounded-2xl overflow-hidden shadow-2xl">
      <AuthPage onAuthSuccess={(user) => { onAuthSuccess(user); onClose(); }} />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Flash overlay — white flash effect on screenshot
// ---------------------------------------------------------------------------
const FlashOverlay = ({ flashing }) => (
  <div
    className="absolute inset-0 z-50 pointer-events-none transition-opacity duration-300"
    style={{ background: 'white', opacity: flashing ? 0.85 : 0 }}
  />
);

const TryOnPage = ({ user, onUserChange, onNavigate }) => {
  const isLoggedIn = !!user;

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogPublic, setSaveDialogPublic] = useState(false);
  const [pendingScreenshot, setPendingScreenshot] = useState(null);
  const [flashing, setFlashing] = useState(false);

  // View angle: 'front' | 'side' | 'back'
  const [activeView, setActiveView] = useState('front');

  // Ease factor for garment tightness/looseness
  const [easeValue, setEaseValue] = useState(DEFAULT_EASE_FACTOR);

  const [selectedClothingType, setSelectedClothingType] = useState('shirt');
  const [upperGarment, setUpperGarment] = useState(null);
  const [lowerGarment, setLowerGarment] = useState(null);
  const [upperTemplateId, setUpperTemplateId] = useState(null);
  const [lowerTemplateId, setLowerTemplateId] = useState(null);

  // Ref to Scene's imperative API (capture + flyToFront)
  const sceneRef = useRef();

  const bodyMeasurements = useBodyMeasurements();
  const garmentUpload = useGarmentUpload(bodyMeasurements.measurements);
  const unitConversion = useUnitConversion();
  const notification = useNotification(4500);
  const { saveOutfit, saving, error: saveError } = useSaveOutfit(user);

  const hasAnyGarment = !!(upperGarment || lowerGarment);
  const mannequinSelected = !!bodyMeasurements.gender;

  React.useEffect(() => {
    return () => { garmentUpload.clearGarment(); if (window.gc) window.gc(); };
  }, []);

  React.useEffect(() => {
    if (garmentUpload.garmentData) {
      _setGarmentForSlot(slotForType(selectedClothingType), garmentUpload.garmentData);
    }
  }, [garmentUpload.garmentData]);

  const _setGarmentForSlot = useCallback((slot, garmentData, templateId = null) => {
    if (slot === UPPER_SLOT) {
      setUpperGarment(prev => {
        if (!garmentData) return null;
        // Avoid creating a new object if data hasn't changed
        const next = { ...garmentData, slot: UPPER_SLOT };
        if (prev && prev.name === next.name && prev.modelUrl === next.modelUrl && prev.slot === next.slot) return prev;
        return next;
      });
      setUpperTemplateId(templateId);
    } else {
      setLowerGarment(prev => {
        if (!garmentData) return null;
        const next = { ...garmentData, slot: LOWER_SLOT };
        if (prev && prev.name === next.name && prev.modelUrl === next.modelUrl && prev.slot === next.slot) return prev;
        return next;
      });
      setLowerTemplateId(templateId);
    }
  }, []);

  const clearSlot = useCallback((slot) => _setGarmentForSlot(slot, null), [_setGarmentForSlot]);
  const clearAllGarments = useCallback(() => {
    setUpperGarment(null); setLowerGarment(null);
    setUpperTemplateId(null); setLowerTemplateId(null);
    garmentUpload.clearGarment();
  }, [garmentUpload]);

  // ── Stable garment data objects for Scene ──────────────────────
  // These useMemo wrappers ensure Scene/WornGarment only re-fits
  // when the actual garment identity changes, not on every render.
  const stableUpperGarment = useMemo(() => upperGarment, [
    upperGarment?.name, upperGarment?.modelUrl, upperGarment?.slot, upperGarment?.id
  ]);
  const stableLowerGarment = useMemo(() => lowerGarment, [
    lowerGarment?.name, lowerGarment?.modelUrl, lowerGarment?.slot, lowerGarment?.id
  ]);

  const handleReset = () => { bodyMeasurements.setGender(null); clearAllGarments(); };

  const handleSelectTemplate = async (templateId, garmentType) => {
    try {
      const template = await garmentTemplateService.getById(templateId);
      const withUrl = await garmentTemplateService.resolveUrls(template);
      const garmentData = garmentTemplateService.templateToGarmentData(withUrl, 'template');
      const slot = slotForType(garmentType);
      setSelectedClothingType(garmentType);
      _setGarmentForSlot(slot, garmentData, templateId);
    } catch (err) {
      console.error('Failed to load template:', err);
    }
  };

  const handleImageUpload = (e) => garmentUpload.handleImageUpload(e, selectedClothingType);

  // ---------------------------------------------------------------------------
  // Screenshot flow:
  //   1. Fly camera to front
  //   2. Flash
  //   3. Capture PNG
  //   4. Open dialog with screenshot pre-captured
  // ---------------------------------------------------------------------------
  const triggerScreenshotAndOpen = useCallback((isPublic) => {
    if (!sceneRef.current) {
      // No scene ref — open dialog without screenshot
      setPendingScreenshot(null);
      setSaveDialogPublic(isPublic);
      setShowSaveDialog(true);
      return;
    }

    // Fly to front-facing position first
    sceneRef.current.flyToFront(() => {
      // Flash effect
      setFlashing(true);
      setTimeout(() => setFlashing(false), 300);

      // Capture
      const base64 = sceneRef.current.capture();
      sceneRef.current.enableOrbit();

      setPendingScreenshot(base64 ?? null);
      setSaveDialogPublic(isPublic);
      setShowSaveDialog(true);
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Save outfit
  // ---------------------------------------------------------------------------
  const handleSaveOutfit = async ({ name, description, tags, isPublic }) => {
    try {
      let garmentType = null;
      if (upperGarment && lowerGarment) garmentType = 'full-outfit';
      else if (upperGarment) garmentType = upperGarment.type ?? selectedClothingType;
      else if (lowerGarment) garmentType = lowerGarment.type ?? selectedClothingType;

      const dominantColor = upperGarment?.dominantColor ?? lowerGarment?.dominantColor ?? null;

      const result = await saveOutfit({
        name, description, tags, isPublic,
        measurements: bodyMeasurements.measurements,
        upperTemplateId: upperTemplateId ?? null,
        lowerTemplateId: lowerTemplateId ?? null,
        canvasEl: null,                    // screenshot already captured below
        screenshotBase64: pendingScreenshot, // pre-captured by triggerScreenshotAndOpen
        dominantColor,
        garmentType,
      });

      setShowSaveDialog(false);
      setPendingScreenshot(null);

      notification.show({
        message: isPublic ? `"${name}" saved & posted on Virtrobe!` : `"${name}" saved to your profile`,
        type: isPublic ? 'posted' : 'success',
        duration: isPublic ? 5000 : 4000,
        action: onNavigate ? { label: 'View in Profile', onClick: () => onNavigate('profile') } : null,
      });

      return result;
    } catch (err) {
      notification.show({ message: `Save failed: ${err.message}`, type: 'error', duration: 6000 });
      console.error('Save failed:', err);
    }
  };

  const handlePost = () => {
    if (!isLoggedIn) { setShowAuthModal(true); return; }
    if (!hasAnyGarment) {
      notification.show({ message: 'Add a garment before posting', type: 'info', duration: 3000 });
      return;
    }
    triggerScreenshotAndOpen(true);
  };

  const handleSave = () => {
    if (!isLoggedIn) { setShowAuthModal(true); return; }
    if (!hasAnyGarment) {
      notification.show({ message: 'Add a garment before saving', type: 'info', duration: 3000 });
      return;
    }
    triggerScreenshotAndOpen(false);
  };

  const handleAuthSuccess = (user) => onUserChange?.(user);

  return (
    <>
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} onAuthSuccess={handleAuthSuccess} />
      )}

      <div className="w-full h-[calc(100vh-12rem)] flex bg-white overflow-hidden">
        <SaveNotification
          isVisible={notification.isVisible}
          notifications={notification.notifications}
          onDismiss={notification.dismiss}
        />

        <div className="flex gap-4 flex-1 overflow-hidden">
          <ClothingSidebar
            selectedType={selectedClothingType}
            onSelectType={setSelectedClothingType}
            onSelectTemplate={handleSelectTemplate}
            onImageUpload={handleImageUpload}
            isDisabled={!mannequinSelected}
            isProcessing={garmentUpload.isProcessing}
            selectedTemplateId={upperTemplateId ?? lowerTemplateId}
          />

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* 3D Viewport */}
            <div
              className="relative bg-gray-50 w-full border border-black/10 flex-shrink-0"
              style={{ aspectRatio: '16/9' }}
            >
              {!mannequinSelected && (
                <GenderSelector
                  onSelectGender={bodyMeasurements.setGender}
                  measurements={bodyMeasurements.measurements}
                />
              )}

              {/* Flash overlay */}
              <FlashOverlay flashing={flashing} />

              {/* Scene — ref gives us capture() + flyToFront() */}
              <Scene
                ref={sceneRef}
                measurements={bodyMeasurements.measurements}
                upperGarmentData={stableUpperGarment}
                lowerGarmentData={stableLowerGarment}
                showGarment={hasAnyGarment}
                autoRotate={!hasAnyGarment}
                mannequinRef={bodyMeasurements.mannequinRef ?? undefined}
                viewAngle={activeView}
                easeFactor={easeValue}
              />

              <SceneOverlay
                gender={bodyMeasurements.gender}
                hasAnyGarment={hasAnyGarment}
                isProcessing={garmentUpload.isProcessing}
                progress={garmentUpload.progress}
                error={garmentUpload.error}
                upperGarment={upperGarment}
                lowerGarment={lowerGarment}
                onClearUpper={() => clearSlot(UPPER_SLOT)}
                onClearLower={() => clearSlot(LOWER_SLOT)}
                onReset={handleReset}
                onRetry={garmentUpload.retryProcessing}
                onSaveOutfit={handleSaveOutfit}
                onPost={handlePost}
                isLoggedIn={isLoggedIn}
                mannequinSelected={mannequinSelected}
                onOpenAuth={() => setShowAuthModal(true)}
                onSave={handleSave}
                activeView={activeView}
                onViewChange={setActiveView}
                easeValue={easeValue}
                onEaseChange={setEaseValue}
              />
            </div>

            <SimilarLooksRow visible={mannequinSelected} />
          </div>
        </div>

        {showSaveDialog && (
          <SaveOutfitDialog
            onSave={handleSaveOutfit}
            onClose={() => { setShowSaveDialog(false); setPendingScreenshot(null); }}
            saving={saving}
            error={saveError}
            defaultPublic={saveDialogPublic}
            screenshotPreview={pendingScreenshot} // pass to dialog to show a preview thumbnail
          />
        )}

        <MeasurementPanel bodyMeasurements={bodyMeasurements} unitConversion={unitConversion} />
      </div>
    </>
  );
};

export default TryOnPage;