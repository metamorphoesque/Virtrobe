// src/components/pages/TryOnPage.jsx
import React, { useState } from 'react';
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

// ---------------------------------------------------------------------------
// Slot routing
// ---------------------------------------------------------------------------
const UPPER_SLOT = 'upper';
const LOWER_SLOT = 'lower';
const LOWER_TYPES = new Set([
  'pants', 'skirt', 'shorts', 'trousers', 'jeans', 'leggings',
]);
const slotForType = (type) =>
  LOWER_TYPES.has(type?.toLowerCase()) ? LOWER_SLOT : UPPER_SLOT;

// ---------------------------------------------------------------------------
// Auth modal — full-screen overlay on top of TryOnPage
// ---------------------------------------------------------------------------
const AuthModal = ({ onClose, onAuthSuccess }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center">
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    />
    {/* Panel — wide, 16/9-ish */}
    <div className="relative z-10 w-full max-w-5xl h-[90vh] max-h-[620px] rounded-2xl overflow-hidden shadow-2xl">
      <AuthPage
        onAuthSuccess={(user) => {
          onAuthSuccess(user);
          onClose();
        }}
      />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// TryOnPage
// ---------------------------------------------------------------------------
const TryOnPage = ({ onSave, onSaveOutfit, onShare, user, onUserChange, onNavigate }) => {
  const isLoggedIn = !!user;

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  // Save outfit dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogPublic, setSaveDialogPublic] = useState(false);

  // Garment slots
  const [selectedClothingType, setSelectedClothingType] = React.useState('shirt');
  const [upperGarment, setUpperGarment] = React.useState(null);
  const [lowerGarment, setLowerGarment] = React.useState(null);
  const [upperTemplateId, setUpperTemplateId] = React.useState(null);
  const [lowerTemplateId, setLowerTemplateId] = React.useState(null);

  const bodyMeasurements = useBodyMeasurements();
  const garmentUpload = useGarmentUpload(bodyMeasurements.measurements);
  const unitConversion = useUnitConversion();
  const notification = useNotification(4500);
  const { saveOutfit, saving, error: saveError } = useSaveOutfit(user);

  const hasAnyGarment = !!(upperGarment || lowerGarment);
  const mannequinSelected = !!bodyMeasurements.gender;

  React.useEffect(() => {
    return () => {
      garmentUpload.clearGarment();
      if (window.gc) window.gc();
    };
  }, []);

  React.useEffect(() => {
    if (garmentUpload.garmentData) {
      const slot = slotForType(selectedClothingType);
      _setGarmentForSlot(slot, garmentUpload.garmentData);
    }
  }, [garmentUpload.garmentData]);

  // ── Slot helpers ────────────────────────────────────────────────────────────

  const _setGarmentForSlot = (slot, garmentData, templateId = null) => {
    if (slot === UPPER_SLOT) {
      setUpperGarment(garmentData ? { ...garmentData, slot: UPPER_SLOT } : null);
      setUpperTemplateId(templateId);
    } else {
      setLowerGarment(garmentData ? { ...garmentData, slot: LOWER_SLOT } : null);
      setLowerTemplateId(templateId);
    }
  };

  const clearSlot = (slot) => _setGarmentForSlot(slot, null);

  const clearAllGarments = () => {
    setUpperGarment(null);
    setLowerGarment(null);
    setUpperTemplateId(null);
    setLowerTemplateId(null);
    garmentUpload.clearGarment();
  };

  const handleReset = () => {
    bodyMeasurements.setGender(null);
    clearAllGarments();
  };

  // ── Garment selection ───────────────────────────────────────────────────────

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

  const handleImageUpload = (event) => {
    garmentUpload.handleImageUpload(event, selectedClothingType);
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const captureScreenshot = () => {
    const canvas = document.querySelector('canvas');
    return canvas ? canvas.toDataURL('image/jpeg', 0.9) : null;
  };

  // ── Save outfit (private or public) ─────────────────────────────────────────
  const handleSaveOutfit = async ({ name, description, tags, isPublic }) => {
    try {
      const canvasEl = document.querySelector('canvas');

      // Determine garment type based on what's equipped
      let garmentType = null;
      if (upperGarment && lowerGarment) garmentType = 'full-outfit';
      else if (upperGarment) garmentType = upperGarment.type ?? selectedClothingType;
      else if (lowerGarment) garmentType = lowerGarment.type ?? selectedClothingType;

      // Extract dominant color from garment data if available
      const dominantColor = upperGarment?.dominantColor ?? lowerGarment?.dominantColor ?? null;

      const result = await saveOutfit({
        name,
        description,
        tags,
        isPublic,
        measurements: bodyMeasurements.measurements,
        upperTemplateId: upperTemplateId ?? null,
        lowerTemplateId: lowerTemplateId ?? null,
        canvasEl,
        dominantColor,
        garmentType,
      });

      setShowSaveDialog(false);

      // Show rich notification based on save type
      if (isPublic) {
        notification.show({
          message: `"${name}" saved & posted on Virtrobe!`,
          type: 'posted',
          duration: 5000,
          action: onNavigate ? {
            label: 'View in Profile',
            onClick: () => onNavigate('profile'),
          } : null,
        });
      } else {
        notification.show({
          message: `"${name}" saved to your profile`,
          type: 'success',
          duration: 4000,
          action: onNavigate ? {
            label: 'View in Profile',
            onClick: () => onNavigate('profile'),
          } : null,
        });
      }

      return result;
    } catch (err) {
      // Show error notification
      notification.show({
        message: `Save failed: ${err.message}`,
        type: 'error',
        duration: 6000,
      });
      console.error('Save failed:', err);
    }
  };

  // ── Post outfit (save as public) ────────────────────────────────────────────
  const handlePost = () => {
    if (!isLoggedIn) { setShowAuthModal(true); return; }
    if (!hasAnyGarment) {
      notification.show({
        message: 'Add a garment before posting',
        type: 'info',
        duration: 3000,
      });
      return;
    }
    // Open save dialog pre-set to public
    setSaveDialogPublic(true);
    setShowSaveDialog(true);
  };

  // Called when auth completes inside the modal
  const handleAuthSuccess = (user) => {
    onUserChange?.(user);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Auth modal — mounts on top of everything */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      <div className="w-full h-[calc(100vh-12rem)] flex bg-white overflow-hidden">
        <SaveNotification
          isVisible={notification.isVisible}
          notifications={notification.notifications}
          onDismiss={notification.dismiss}
        />

        <div className="flex gap-4 flex-1 overflow-hidden">

          {/* Clothing sidebar */}
          <ClothingSidebar
            selectedType={selectedClothingType}
            onSelectType={setSelectedClothingType}
            onSelectTemplate={handleSelectTemplate}
            onImageUpload={handleImageUpload}
            isDisabled={!mannequinSelected}
            isProcessing={garmentUpload.isProcessing}
            selectedTemplateId={upperTemplateId ?? lowerTemplateId}
          />

          {/* Centre column */}
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

              <Scene
                measurements={bodyMeasurements.measurements}
                upperGarmentData={upperGarment}
                lowerGarmentData={lowerGarment}
                showGarment={hasAnyGarment}
                autoRotate={!hasAnyGarment}
                mannequinRef={bodyMeasurements.mannequinRef ?? undefined}
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
                onSave={() => {
                  if (!isLoggedIn) { setShowAuthModal(true); return; }
                  if (!hasAnyGarment) {
                    notification.show({
                      message: 'Add a garment before saving',
                      type: 'info',
                      duration: 3000,
                    });
                    return;
                  }
                  setSaveDialogPublic(false);
                  setShowSaveDialog(true);
                }}
              />
            </div>

            {/* Similar looks */}
            <SimilarLooksRow visible={mannequinSelected} />
          </div>
        </div>

        {/* Save Outfit Dialog */}
        {showSaveDialog && (
          <SaveOutfitDialog
            onSave={handleSaveOutfit}
            onClose={() => setShowSaveDialog(false)}
            saving={saving}
            error={saveError}
            defaultPublic={saveDialogPublic}
          />
        )}

        {/* Measurement panel */}
        <MeasurementPanel
          bodyMeasurements={bodyMeasurements}
          unitConversion={unitConversion}
        />
      </div>
    </>
  );
};

export default TryOnPage;