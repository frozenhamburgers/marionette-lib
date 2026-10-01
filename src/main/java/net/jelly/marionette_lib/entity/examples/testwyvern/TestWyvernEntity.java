package net.jelly.marionette_lib.entity.examples.testwyvern;

import net.jelly.marionette_lib.utility.FabrikAnimator;
import net.jelly.marionette_lib.utility.Limb;
import net.jelly.marionette_lib.utility.Marionette;
import net.jelly.marionette_lib.utility.MarionettePart;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.monster.Phantom;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.entity.PartEntity;

import java.util.List;

/**
 * Scaffolded by the Marionette Blockbench plugin. This file is YOURS. The rig
 * lives in {@link TestWyvernRig}, which is what regenerating rewrites.
 * Exporting only touches this file while its Entity box stays ticked, so untick
 * that once there is behaviour here worth keeping.
 *
 * Everything below the rig field is hand-written, and re-exporting the rig no
 * longer threatens any of it. That is the whole reason the split exists.
 */
public class TestWyvernEntity extends Phantom implements Marionette {
    private static final int LEG_COUNT = 4;

    // wyvern's step shape held in proportion: a leg here is three 0.5 block segments, 1.5 blocks of
    // reach against the wyvern's 2, so its rest spot and thresholds scale with that
    private static final float LEG_REACH = 1.0f;
    private static final float REST_SIDEWAYS = 0.75f * LEG_REACH;
    private static final float REST_FORWARD = 0.625f * LEG_REACH;
    private static final float STEP_DISTANCE = LEG_REACH;
    private static final float SETTLE_DISTANCE = 0.3f * LEG_REACH;

    private final TestWyvernRig<TestWyvernEntity> rig;

    private final List<Limb<MarionettePart<TestWyvernEntity>>> legs;
    private final boolean[] legReturning = new boolean[LEG_COUNT];

    public TestWyvernEntity(EntityType<? extends Phantom> entityType, Level level) {
        super(entityType, level);
        rig = new TestWyvernRig<>(this);
        legs = List.of(rig.limb2, rig.limb3, rig.limb4, rig.limb5);
    }

    public TestWyvernRig<TestWyvernEntity> rig() {
        return rig;
    }

    @Override
    public List<Limb<?>> getLimbs() {
        return rig.limbs();
    }

    @Override
    public boolean isMultipartEntity() {
        return true;
    }

    @Override
    public PartEntity<?>[] getParts() {
        return getMarionetteParts();
    }

    @Override
    public void remove(RemovalReason removalReason) {
        super.remove(removalReason);
        removeMarionette(removalReason);
    }

    @Override
    public void tick() {
        super.tick();

        for (int i = 0; i < LEG_COUNT; i++) {
            stepLeg(i);
        }

        tickMarionette();
    }

    /** Keeps leg {@code i}'s foot near its resting spot relative to the body, stepping when it drifts too far. */
    private void stepLeg(int i) {
        FabrikAnimator legAnimator = legs.get(i).animator();
        // the pair index the exported limb attached itself to, which is where its root already resolves
        int rootIndex = i <= 1 ? 2 : 4;
        MarionettePart<TestWyvernEntity> rootPart = rig.limb.parts()[rootIndex];
        int bodySide = i % 2 == 0 ? 1 : -1;

        Vec3 direction = rig.limb.parts()[rootIndex - 1].position().subtract(rootPart.position()).normalize();
        Vec3 legRest = rootPart.position()
                .add(direction.cross(new Vec3(0, 1, 0)).normalize().scale(REST_SIDEWAYS * bodySide))
                .add(direction.scale(REST_FORWARD));

        if (legAnimator.chainEndPos().distanceTo(legRest) > STEP_DISTANCE) {
            legReturning[i] = true;
        }

        if (legReturning[i]) {
            legAnimator.setFabrikTarget(legAnimator.chainEndPos()
                    .add(legRest.subtract(legAnimator.chainEndPos()).normalize()
                            .scale(legRest.subtract(legAnimator.chainEndPos()).length()))
                    .add(legRest.subtract(legAnimator.chainEndPos()).scale(0.25))
                    .add(legRest.subtract(legAnimator.chainEndPos()).normalize().scale(0.1))
            );
            if (legAnimator.chainEndPos().distanceTo(legRest) < SETTLE_DISTANCE) {
                legReturning[i] = false;
            }
        }
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Animal.createLivingAttributes()
                .add(Attributes.MAX_HEALTH, 20D)
                .add(Attributes.FOLLOW_RANGE, 24D)
                .add(Attributes.MOVEMENT_SPEED, 0.25D)
                .add(Attributes.ARMOR_TOUGHNESS, 0.1f)
                .add(Attributes.ATTACK_KNOCKBACK, 0.5f)
                .add(Attributes.ATTACK_DAMAGE, 2f);
    }

    @Override
    protected boolean isSunBurnTick() {
        return false;
    }
}
